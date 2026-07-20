import type { QueryOptions } from '~/features/activity/store/activityTypes';
import { filterQueryBackedActivityVisualizations } from '~/features/activity/store/activityQueryPlan';
export { preloadActivityViewComponents } from './activityComponentPreload';

interface ActivityStoreLike {
  ensure_loaded(queryOptions: QueryOptions): Promise<void>;
  isAbortError(error: unknown): boolean;
  reset(): void | Promise<void>;
}

interface ActivityHighlightStoreLike {
  clear(): void;
}

interface ActivityCategoryStoreLike {
  load(): void;
}

interface ActivityViewLike {
  elements?: Array<{ type: string }>;
}

export function buildActivityQueryOptions({
  host,
  timeperiod,
  periodMode,
  force,
  filterAfk,
  includeAudible,
  filterCategories,
  alwaysActivePattern,
  currentView,
}: {
  host: string;
  timeperiod: QueryOptions['timeperiod'];
  periodMode?: QueryOptions['period_mode'];
  force?: boolean;
  filterAfk: boolean;
  includeAudible: boolean;
  filterCategories?: string[][] | null;
  alwaysActivePattern?: string;
  currentView?: ActivityViewLike | null;
}): QueryOptions {
  return {
    timeperiod,
    period_mode: periodMode,
    host: decodeURIComponent(host),
    force,
    filter_afk: filterAfk,
    include_audible: includeAudible,
    filter_categories: filterCategories || undefined,
    dont_query_inactive: filterAfk,
    always_active_pattern: alwaysActivePattern,
    requested_visualizations: filterQueryBackedActivityVisualizations(
      currentView?.elements?.map(el => el.type)
    ),
  };
}

export async function refreshActivityView({
  activityStore,
  highlightStore,
  queryOptions,
  force,
}: {
  activityStore: ActivityStoreLike;
  highlightStore: ActivityHighlightStoreLike;
  queryOptions: QueryOptions;
  force?: boolean;
}): Promise<void> {
  if (force) {
    highlightStore.clear();
  }

  try {
    await activityStore.ensure_loaded(queryOptions);
  } catch (error) {
    if (activityStore.isAbortError(error)) {
      return;
    }
    throw error;
  }
}

export function triggerReactiveActivityRefresh({
  isBootstrapping,
  highlightStore,
  refresh,
}: {
  isBootstrapping: boolean;
  highlightStore: ActivityHighlightStoreLike;
  refresh: () => void;
}): boolean {
  if (isBootstrapping) {
    return false;
  }

  highlightStore.clear();
  refresh();
  return true;
}

export async function bootstrapActivityView({
  normalizeRouteIfNeeded,
  categoryStore,
  refresh,
  onError,
}: {
  normalizeRouteIfNeeded: () => Promise<unknown>;
  categoryStore: ActivityCategoryStoreLike;
  refresh: () => Promise<void>;
  onError: (message: string, error: unknown) => void;
}): Promise<void> {
  try {
    await normalizeRouteIfNeeded();
  } catch (error) {
    onError('Failed to normalize activity route', error);
  }

  try {
    categoryStore.load();
  } catch (error) {
    onError('Failed to load categories', error);
  }

  try {
    await refresh();
  } catch (error) {
    onError('Failed to refresh activity view', error);
    if (!(error instanceof Error) || error.message !== 'canceled') {
      throw error;
    }
  }
}

export async function teardownActivityView({
  highlightStore,
  activityStore,
}: {
  highlightStore: ActivityHighlightStoreLike;
  activityStore: ActivityStoreLike;
}): Promise<void> {
  highlightStore.clear();
  await activityStore.reset();
}
