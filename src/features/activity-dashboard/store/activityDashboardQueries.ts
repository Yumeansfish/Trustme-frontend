import {
  buildCompactSummaryLogicalPeriods,
  buildCompactSummarySnapshotPeriods,
  emptyBrowserResult,
  parseExecutionRange,
} from './activityData';
import { fetchDashboardSummarySnapshot } from './dashboardClient';
import {
  shouldIncludeBrowserData,
  shouldQueryCategoryTimeByPeriod,
  shouldQueryWindowData,
} from './activityVisualizations';
import type { QueryOptions } from './activityTypes';
import type {
  ActivityDashboardViewContext,
  DashboardDetailsArgs,
} from './activityDashboardQueryTypes';
export type { ActivityDashboardQueryContext } from './activityDashboardQueryTypes';
export {
  commitDashboardSnapshotResult,
  completeEmptyDashboardWindowData,
} from './activityDashboardSemantics';
export { queryDashboardDetailsResult } from './activityDashboardDetails';

type DashboardViewPlan = {
  includeBrowserData: boolean;
  includeCategoryByPeriod: boolean;
};

function createDashboardViewPlan(queryOptions: QueryOptions): DashboardViewPlan {
  return {
    includeBrowserData: shouldIncludeBrowserData(queryOptions),
    includeCategoryByPeriod: shouldQueryCategoryTimeByPeriod(queryOptions),
  };
}

function completeUnavailableDashboardWindowPanels(
  store: ActivityDashboardViewContext,
  requestNonce: number,
  plan: DashboardViewPlan
) {
  store.query_window_completed(undefined, requestNonce);
  store.query_browser_completed(emptyBrowserResult(), requestNonce);

  if (plan.includeCategoryByPeriod) {
    store.query_category_time_by_period_completed({ by_period: {} }, requestNonce);
  }
}

async function queryDashboardSnapshotPhase(
  store: ActivityDashboardViewContext,
  queryOptions: QueryOptions,
  requestNonce: number,
  plan: DashboardViewPlan
): Promise<string[]> {
  if (!shouldQueryWindowData(queryOptions)) {
    return [];
  }

  if (!store.window.available) {
    completeUnavailableDashboardWindowPanels(store, requestNonce, plan);
    return [];
  }

  const summaryPeriods = buildCompactSummarySnapshotPeriods(
    queryOptions.timeperiod!,
    queryOptions.period_mode
  );
  const categoryPeriods = buildCompactSummaryLogicalPeriods(
    queryOptions.timeperiod!,
    queryOptions.period_mode
  );
  if (summaryPeriods.length === 0 || categoryPeriods.length === 0) {
    store.completeEmptyWindowData(queryOptions, requestNonce);
    return [];
  }

  const dashboardSnapshot = await fetchDashboardSummarySnapshot({
    range: parseExecutionRange(summaryPeriods),
    categoryPeriods,
    filterAfk: queryOptions.filter_afk,
    filterCategories: queryOptions.filter_categories,
  });

  if (!store.isCurrentRequest(requestNonce)) {
    return [];
  }

  if (dashboardSnapshot) {
    store.commitDashboardSnapshot(queryOptions, dashboardSnapshot, requestNonce);
    return [];
  }

  store.completeEmptyWindowData(queryOptions, requestNonce);
  return ['summary snapshot'];
}

function resolveDashboardDetailsArgs(
  store: ActivityDashboardViewContext,
  plan: DashboardViewPlan
): DashboardDetailsArgs {
  return {
    includeBrowserData:
      plan.includeBrowserData &&
      store.buckets.window.length > 0 &&
      store.buckets.browser.length > 0,
  };
}

function completeUnavailableDashboardDetails(
  store: ActivityDashboardViewContext,
  requestNonce: number,
  plan: DashboardViewPlan
) {
  if (plan.includeBrowserData) {
    store.query_browser_completed(emptyBrowserResult(), requestNonce);
  }
}

async function queryDashboardDetailsPhase(
  store: ActivityDashboardViewContext,
  queryOptions: QueryOptions,
  requestNonce: number,
  plan: DashboardViewPlan
): Promise<string[]> {
  const detailsArgs = resolveDashboardDetailsArgs(store, plan);
  if (!detailsArgs.includeBrowserData) {
    completeUnavailableDashboardDetails(store, requestNonce, plan);
    return [];
  }

  const detailsLoaded = await store.query_dashboard_details(
    queryOptions,
    requestNonce,
    detailsArgs
  );
  if (!store.isCurrentRequest(requestNonce)) {
    return [];
  }

  if (detailsLoaded) {
    return [];
  }

  completeUnavailableDashboardDetails(store, requestNonce, plan);
  return ['details'];
}

export async function queryDashboardView(
  store: ActivityDashboardViewContext,
  queryOptions: QueryOptions,
  requestNonce: number
) {
  const { timeperiod } = queryOptions;
  const plan = createDashboardViewPlan(queryOptions);
  const missingDtos: string[] = [];

  store.setActivityDataPath('dashboard');
  store.setActivityDataNotice(null);

  if (!timeperiod) {
    store.completeEmptyWindowData(queryOptions, requestNonce);
    return;
  }

  missingDtos.push(...(await queryDashboardSnapshotPhase(store, queryOptions, requestNonce, plan)));

  if (!store.isCurrentRequest(requestNonce)) return;

  missingDtos.push(...(await queryDashboardDetailsPhase(store, queryOptions, requestNonce, plan)));

  if (!store.isCurrentRequest(requestNonce)) return;

  if (missingDtos.length > 0) {
    store.markDashboardDegraded(missingDtos);
  }
}
