import { useSettingsStore } from '~/features/settings/store/settings';

import { fetchActivityScope } from '~/features/activity/lib/activityScopeClient';
import {
  syncActivityScope,
  syncActivityBuckets,
  updateActivityAvailability,
} from './activityBucketRuntime';
import { shouldUseActivityDataFlow } from './activityQueryPlan';
import { beginActivityRequest, finishActivityRequest } from './activityRequestCancellation';
import { dateToTimeperiod } from '~/app/lib/timeperiod';
import type {
  ActivityDataNotice,
  BrowserQueryResult,
  CategoryPeriodData,
  ActivityScopeResult,
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
  query_activity(
    queryOptions: QueryOptions,
    requestNonce: number,
    signal?: AbortSignal
  ): Promise<void>;
  query_window_completed(data?: WindowQueryResult | null, requestNonce?: number): void;
  query_browser_completed(data?: BrowserQueryResult | null, requestNonce?: number): void;
  query_category_time_by_period_completed(
    payload?: { by_period?: CategoryPeriodData },
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
  requestNonce: number,
  signal: AbortSignal
): Promise<{
  scope: ActivityScopeResult | null;
  cancelled: boolean;
}> {
  const settingsStore = useSettingsStore();
  await settingsStore.ensureLoaded();
  if (!store.isCurrentRequest(requestNonce)) {
    return {
      scope: null,
      cancelled: true,
    };
  }

  const scope = await fetchActivityScope(signal);

  return { scope, cancelled: false };
}

async function runActivityQueryFlow(
  store: ActivityCoordinatorContext,
  queryOptions: QueryOptions,
  requestNonce: number,
  signal: AbortSignal
) {
  if (!shouldUseActivityDataFlow(queryOptions)) {
    store.setActivityDataPath('activity');
    store.setActivityDataNotice({
      variant: 'warning',
      title: 'Unsupported activity view',
      message:
        'This saved view referenced visualizations that are no longer supported. Unsupported panels were dropped.',
      items: [],
    });
    return;
  }

  await store.query_activity(queryOptions, requestNonce, signal);
}

export async function ensureActivityLoaded(
  store: ActivityCoordinatorContext,
  queryOptions: QueryOptions
) {
  const preparedQueryOptions = hydrateActivityQueryOptions(queryOptions);
  const requestNonce = store.start_loading(preparedQueryOptions);
  const signal = beginActivityRequest();

  try {
    const { scope, cancelled } = await prepareActivityQueryEnvironment(store, requestNonce, signal);
    if (cancelled || !store.isCurrentRequest(requestNonce)) return;

    syncActivityScope(store, scope);
    syncActivityBuckets(store as Pick<State, 'buckets'>, scope);
    updateActivityAvailability(
      store as unknown as Pick<State, 'window' | 'browser' | 'editor' | 'category' | 'buckets'>
    );
    if (!store.isCurrentRequest(requestNonce)) return;
    await runActivityQueryFlow(store, preparedQueryOptions, requestNonce, signal);
  } catch (error) {
    if (store.isAbortError(error) || !store.isCurrentRequest(requestNonce)) {
      return;
    }
    throw error;
  } finally {
    finishActivityRequest(signal);
    store.finish_loading(requestNonce);
  }
}
