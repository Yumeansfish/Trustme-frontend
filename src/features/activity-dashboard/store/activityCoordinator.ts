import { getClient } from '~/app/lib/awclient';
import { useSettingsStore } from '~/features/settings/store/settings';

import { fetchDashboardResolvedScope } from './dashboardClient';
import {
  syncActivityScope,
  syncActivityBuckets,
  updateActivityAvailability,
} from './activityBucketRuntime';
import { shouldUseDashboardDtoFlow } from './activityVisualizations';
import { dateToTimeperiod } from '~/app/lib/timeperiod';
import type {
  ActivityDataNotice,
  BrowserQueryResult,
  DashboardResolvedScopeResult,
  QueryOptions,
  State,
  WindowQueryResult,
} from './activityTypes';

export interface ActivityCoordinatorContext {
  loaded: State['loaded'];
  window: State['window'];
  buckets: State['buckets'];
  scope: State['scope'];
  isAbortError(error: unknown): boolean;
  isCurrentRequest(requestNonce: number): boolean;
  start_loading(queryOptions: QueryOptions): number;
  finish_loading(requestNonce: number): void;
  query_dashboard_view(queryOptions: QueryOptions, requestNonce: number): Promise<void>;
  query_window_completed(data?: WindowQueryResult | null, requestNonce?: number): void;
  query_browser_completed(data?: BrowserQueryResult | null, requestNonce?: number): void;
  query_category_time_by_period_completed(
    payload?: { by_period?: Record<string, { cat_events: any[] }> },
    requestNonce?: number
  ): void;
  setActivityDataPath(mode: State['data_path']): void;
  setActivityDataNotice(notice: ActivityDataNotice | null): void;
}

function hydrateActivityQueryOptions(queryOptions: QueryOptions): QueryOptions {
  const normalizedDate = queryOptions.date ?? new Date().toISOString().slice(0, 10);
  const timeperiod = queryOptions.timeperiod ?? dateToTimeperiod(normalizedDate);

  return {
    ...queryOptions,
    timeperiod,
  };
}

async function prepareActivityQueryEnvironment(
  store: ActivityCoordinatorContext,
  requestNonce: number
): Promise<{
  resolvedScope: DashboardResolvedScopeResult | null;
  cancelled: boolean;
}> {
  const settingsStore = useSettingsStore();
  await settingsStore.ensureLoaded();
  if (!store.isCurrentRequest(requestNonce)) {
    return {
      resolvedScope: null,
      cancelled: true,
    };
  }

  const resolvedScope = await fetchDashboardResolvedScope();

  return { resolvedScope, cancelled: false };
}

async function runActivityQueryFlow(
  store: ActivityCoordinatorContext,
  queryOptions: QueryOptions,
  requestNonce: number
) {
  if (!shouldUseDashboardDtoFlow(queryOptions)) {
    store.setActivityDataPath('dashboard');
    store.setActivityDataNotice({
      variant: 'warning',
      title: 'Unsupported activity view',
      message:
        'This saved view referenced visualizations that no longer exist on the supported dashboard path. Unsupported panels were dropped.',
      items: [],
    });
    return;
  }

  await store.query_dashboard_view(queryOptions, requestNonce);
}

export async function ensureActivityLoaded(
  store: ActivityCoordinatorContext,
  queryOptions: QueryOptions
) {
  const preparedQueryOptions = hydrateActivityQueryOptions(queryOptions);
  const hadLoadedState = store.loaded;
  const requestNonce = store.start_loading(preparedQueryOptions);

  try {
    if (hadLoadedState) {
      await getClient().abort();
    }

    const { resolvedScope, cancelled } = await prepareActivityQueryEnvironment(store, requestNonce);
    if (cancelled || !store.isCurrentRequest(requestNonce)) return;

    syncActivityScope(store, resolvedScope);
    syncActivityBuckets(store as Pick<State, 'buckets'>, resolvedScope);
    updateActivityAvailability(
      store as unknown as Pick<
        State,
        'window' | 'browser' | 'editor' | 'category' | 'buckets'
      >
    );
    if (!store.isCurrentRequest(requestNonce)) return;
    await runActivityQueryFlow(store, preparedQueryOptions, requestNonce);
  } catch (error) {
    if (store.isAbortError(error) || !store.isCurrentRequest(requestNonce)) {
      return;
    }
    throw error;
  } finally {
    store.finish_loading(requestNonce);
  }
}
