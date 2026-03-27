import type { DashboardResolvedScopeResult, State } from './activityTypes';

type ActivityBucketsState = State['buckets'];
type ActivityScopeState = State['scope'];
type ActivityAvailabilityState = Pick<
  State,
  'window' | 'browser' | 'editor' | 'category' | 'buckets'
>;

export function syncActivityScope(
  state: Pick<State, 'scope'>,
  resolvedScope: DashboardResolvedScopeResult | null = null
): ActivityScopeState {
  state.scope.group_name = resolvedScope?.group_name || '';
  state.scope.resolved_hosts = resolvedScope?.resolved_hosts || [];
  state.scope.available_dates = resolvedScope?.available_dates;
  state.scope.earliest_available_date = resolvedScope?.earliest_available_date || '';
  state.scope.latest_available_date = resolvedScope?.latest_available_date || '';
  return state.scope;
}

export function syncActivityBuckets(
  state: Pick<State, 'buckets'>,
  resolvedScope: DashboardResolvedScopeResult | null = null
): ActivityBucketsState {
  state.buckets.loaded = true;
  state.buckets.afk = resolvedScope?.afk_buckets || [];
  state.buckets.window = resolvedScope?.window_buckets || [];
  state.buckets.browser = resolvedScope?.browser_buckets || [];
  state.buckets.editor = [];
  return state.buckets;
}

export function updateActivityAvailability(state: ActivityAvailabilityState): void {
  state.window.available = state.buckets.afk.length > 0 && state.buckets.window.length > 0;
  state.browser.available = state.window.available && state.buckets.browser.length > 0;
  state.editor.available = false;
  state.category.available = state.window.available;
}
