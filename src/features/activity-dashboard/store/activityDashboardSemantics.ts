import { emptyBrowserResult } from './activityData';
import { shouldQueryCategoryTimeByPeriod } from './activityVisualizations';
import type { DashboardSummarySnapshotResult, QueryOptions } from './activityTypes';
import type { ActivityDashboardQueryContext } from './activityDashboardQueryTypes';

export function completeEmptyDashboardWindowData(
  store: ActivityDashboardQueryContext,
  queryOptions: QueryOptions,
  requestNonce: number
) {
  store.query_window_completed({}, requestNonce);
  store.query_browser_completed(emptyBrowserResult(), requestNonce);

  if (shouldQueryCategoryTimeByPeriod(queryOptions)) {
    store.query_category_time_by_period_completed({ by_period: {} }, requestNonce);
  }
}

export function commitDashboardSnapshotResult(
  store: ActivityDashboardQueryContext,
  queryOptions: QueryOptions,
  dashboardSnapshot: DashboardSummarySnapshotResult,
  requestNonce: number
) {
  store.query_window_completed(dashboardSnapshot.window, requestNonce);
  store.query_browser_completed(emptyBrowserResult(), requestNonce);

  if (shouldQueryCategoryTimeByPeriod(queryOptions)) {
    store.query_category_time_by_period_completed(
      { by_period: dashboardSnapshot.by_period },
      requestNonce
    );
  }
}
