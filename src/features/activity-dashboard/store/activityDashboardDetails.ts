import {
  buildExecutionQueryPeriods,
  emptyBrowserResult,
  parseExecutionRange,
} from './activityData';
import { fetchDashboardDetails } from './dashboardClient';
import type { QueryOptions } from './activityTypes';
import type {
  ActivityDashboardQueryContext,
  DashboardDetailsArgs,
} from './activityDashboardQueryTypes';

export async function queryDashboardDetailsResult(
  store: ActivityDashboardQueryContext,
  queryOptions: QueryOptions,
  requestNonce: number,
  { includeBrowserData }: DashboardDetailsArgs
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

  const dashboardDetails = await fetchDashboardDetails({
    range: executionRange,
  });

  if (!store.isCurrentRequest(requestNonce)) return true;
  if (!dashboardDetails) {
    return false;
  }

  store.query_browser_completed(
    includeBrowserData ? dashboardDetails.browser : emptyBrowserResult(),
    requestNonce
  );
  return true;
}
