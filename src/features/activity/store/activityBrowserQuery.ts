import {
  buildExecutionQueryPeriods,
  emptyBrowserResult,
  parseExecutionRange,
} from './activityData';
import { fetchBrowserActivity } from '~/features/browser/lib/browserClient';
import type { QueryOptions } from './activityTypes';
import type {
  ActivityQueryContext,
  BrowserQueryArgs,
} from './activityQueryTypes';

export async function queryActivityBrowserResult(
  store: ActivityQueryContext,
  queryOptions: QueryOptions,
  requestNonce: number,
  { includeBrowserData }: BrowserQueryArgs,
  signal?: AbortSignal
) {
  if (!queryOptions.timeperiod || !includeBrowserData) {
    return false;
  }

  const periods = buildExecutionQueryPeriods(queryOptions.timeperiod);
  const executionRange = parseExecutionRange(periods);

  if (!executionRange) {
    store.query_browser_completed(emptyBrowserResult(), requestNonce);
    return true;
  }

  const browserResult = await fetchBrowserActivity({
    range: executionRange,
    signal,
  });

  if (!store.isCurrentRequest(requestNonce)) return true;
  if (!browserResult) {
    return false;
  }

  store.query_browser_completed(
    includeBrowserData ? browserResult : emptyBrowserResult(),
    requestNonce
  );
  return true;
}
