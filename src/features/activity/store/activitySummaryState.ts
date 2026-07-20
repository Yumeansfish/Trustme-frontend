import { emptyBrowserResult } from './activityData';
import { shouldQueryCategoryTimeByPeriod } from './activityQueryPlan';
import type { ActivitySummaryResult, QueryOptions } from './activityTypes';
import type { ActivityQueryContext } from './activityQueryTypes';

export function completeEmptyActivityData(
  store: ActivityQueryContext,
  queryOptions: QueryOptions,
  requestNonce: number
) {
  store.query_window_completed(null, requestNonce);
  store.query_browser_completed(emptyBrowserResult(), requestNonce);

  if (shouldQueryCategoryTimeByPeriod(queryOptions)) {
    store.query_category_time_by_period_completed({ by_period: {} }, requestNonce);
  }
}

export function commitActivitySummaryResult(
  store: ActivityQueryContext,
  queryOptions: QueryOptions,
  summary: ActivitySummaryResult,
  requestNonce: number
) {
  store.query_window_completed(summary.window, requestNonce);
  store.query_browser_completed(emptyBrowserResult(), requestNonce);

  if (shouldQueryCategoryTimeByPeriod(queryOptions)) {
    store.query_category_time_by_period_completed(
      { by_period: summary.by_period },
      requestNonce
    );
  }
}
