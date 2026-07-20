import {
  buildCompactSummaryLogicalPeriods,
  buildCompactSummaryPeriods,
  emptyBrowserResult,
  parseExecutionRange,
} from './activityData';
import { fetchSummary } from '~/features/summary/lib/summaryClient';
import {
  shouldIncludeBrowserData,
  shouldQueryCategoryTimeByPeriod,
  shouldQueryWindowData,
} from './activityQueryPlan';
import type { QueryOptions } from './activityTypes';
import type {
  ActivityViewQueryContext,
  BrowserQueryArgs,
} from './activityQueryTypes';
export type { ActivityQueryContext } from './activityQueryTypes';
export {
  commitActivitySummaryResult,
  completeEmptyActivityData,
} from './activitySummaryState';
export { queryActivityBrowserResult } from './activityBrowserQuery';

type ActivityQueryPlan = {
  includeBrowserData: boolean;
  includeCategoryByPeriod: boolean;
};

function createActivityQueryPlan(queryOptions: QueryOptions): ActivityQueryPlan {
  return {
    includeBrowserData: shouldIncludeBrowserData(queryOptions),
    includeCategoryByPeriod: shouldQueryCategoryTimeByPeriod(queryOptions),
  };
}

function completeUnavailableWindowPanels(
  store: ActivityViewQueryContext,
  requestNonce: number,
  plan: ActivityQueryPlan
) {
  store.query_window_completed(undefined, requestNonce);
  store.query_browser_completed(emptyBrowserResult(), requestNonce);

  if (plan.includeCategoryByPeriod) {
    store.query_category_time_by_period_completed({ by_period: {} }, requestNonce);
  }
}

async function querySummaryPhase(
  store: ActivityViewQueryContext,
  queryOptions: QueryOptions,
  requestNonce: number,
  plan: ActivityQueryPlan,
  signal?: AbortSignal
): Promise<string[]> {
  if (!shouldQueryWindowData(queryOptions)) {
    return [];
  }

  if (!store.window.available) {
    completeUnavailableWindowPanels(store, requestNonce, plan);
    return [];
  }

  const summaryPeriods = buildCompactSummaryPeriods(
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

  const summary = await fetchSummary({
    range: parseExecutionRange(summaryPeriods),
    categoryPeriods,
    filterAfk: queryOptions.filter_afk,
    filterCategories: queryOptions.filter_categories,
    signal,
  });

  if (!store.isCurrentRequest(requestNonce)) {
    return [];
  }

  if (summary) {
    store.commitActivitySummary(queryOptions, summary, requestNonce);
    return [];
  }

  store.completeEmptyWindowData(queryOptions, requestNonce);
  return ['summary'];
}

function resolveBrowserArgs(
  store: ActivityViewQueryContext,
  plan: ActivityQueryPlan
): BrowserQueryArgs {
  return {
    includeBrowserData:
      plan.includeBrowserData &&
      store.buckets.window.length > 0 &&
      store.buckets.browser.length > 0,
  };
}

function completeUnavailableBrowser(
  store: ActivityViewQueryContext,
  requestNonce: number,
  plan: ActivityQueryPlan
) {
  if (plan.includeBrowserData) {
    store.query_browser_completed(emptyBrowserResult(), requestNonce);
  }
}

async function queryBrowserPhase(
  store: ActivityViewQueryContext,
  queryOptions: QueryOptions,
  requestNonce: number,
  plan: ActivityQueryPlan,
  signal?: AbortSignal
): Promise<string[]> {
  const browserArgs = resolveBrowserArgs(store, plan);
  if (!browserArgs.includeBrowserData) {
    completeUnavailableBrowser(store, requestNonce, plan);
    return [];
  }

  const browserLoaded = await store.query_activity_browser(
    queryOptions,
    requestNonce,
    browserArgs,
    signal
  );
  if (!store.isCurrentRequest(requestNonce)) {
    return [];
  }

  if (browserLoaded) {
    return [];
  }

  completeUnavailableBrowser(store, requestNonce, plan);
  return ['browser'];
}

export async function queryActivity(
  store: ActivityViewQueryContext,
  queryOptions: QueryOptions,
  requestNonce: number,
  signal?: AbortSignal
) {
  const { timeperiod } = queryOptions;
  const plan = createActivityQueryPlan(queryOptions);
  const missingDtos: string[] = [];

  store.setActivityDataPath('activity');
  store.setActivityDataNotice(null);

  if (!timeperiod) {
    store.completeEmptyWindowData(queryOptions, requestNonce);
    return;
  }

  missingDtos.push(
    ...(await querySummaryPhase(store, queryOptions, requestNonce, plan, signal))
  );

  if (!store.isCurrentRequest(requestNonce)) return;

  missingDtos.push(
    ...(await queryBrowserPhase(store, queryOptions, requestNonce, plan, signal))
  );

  if (!store.isCurrentRequest(requestNonce)) return;

  if (missingDtos.length > 0) {
    store.markActivityDataDegraded(missingDtos);
  }
}
