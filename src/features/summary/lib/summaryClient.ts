import { getClient } from '~/app/lib/awclient';
import { ensureDuration, ensureEventList } from '~/shared/lib/activitywatchData';
import { abortableRequestConfig, isRequestAbortError } from '~/shared/lib/httpRequest';
import type { ExecutionRange } from '~/shared/lib/timeRange';

import { ensureByPeriod } from './summaryData';
import type { SummaryResult } from './summaryTypes';

const SUMMARY_ENDPOINT = '/0/dashboard/summary';

export async function fetchSummary({
  range,
  categoryPeriods,
  filterAfk,
  filterCategories,
  signal,
}: {
  range: ExecutionRange | null;
  categoryPeriods: string[];
  filterAfk: boolean | undefined;
  filterCategories: string[][] | undefined;
  signal?: AbortSignal;
}): Promise<SummaryResult | null> {
  if (!range || categoryPeriods.length === 0) return null;

  let response;
  try {
    response = await getClient().req.post(
      SUMMARY_ENDPOINT,
      {
        range: { start: range.start.toISOString(), end: range.end.toISOString() },
        category_periods: categoryPeriods,
        filter_afk: Boolean(filterAfk),
        filter_categories: filterCategories || [],
      },
      abortableRequestConfig(signal)
    );
  } catch (error) {
    if (isRequestAbortError(error)) throw error;
    console.warn('Summary endpoint unavailable', error);
    return null;
  }
  return {
    window: {
      app_events: ensureEventList(response.data?.window?.app_events),
      cat_events: ensureEventList(response.data?.window?.cat_events),
      duration: ensureDuration(response.data?.window?.duration),
    },
    by_period: ensureByPeriod(response.data?.by_period),
  };
}
