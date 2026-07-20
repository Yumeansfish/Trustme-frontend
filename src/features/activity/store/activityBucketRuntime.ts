import type { ActivityScopeResult, State } from './activityTypes';

type ActivityBucketsState = State['buckets'];
type ActivityScopeState = State['scope'];
type ActivityAvailabilityState = Pick<
  State,
  'window' | 'browser' | 'editor' | 'category' | 'buckets'
>;

export function syncActivityScope(
  state: Pick<State, 'scope'>,
  scope: ActivityScopeResult | null = null
): ActivityScopeState {
  state.scope.group_name = scope?.group_name || '';
  state.scope.resolved_hosts = scope?.resolved_hosts || [];
  state.scope.available_dates = scope?.available_dates;
  state.scope.earliest_available_date = scope?.earliest_available_date || '';
  state.scope.latest_available_date = scope?.latest_available_date || '';
  return state.scope;
}

export function syncActivityBuckets(
  state: Pick<State, 'buckets'>,
  scope: ActivityScopeResult | null = null
): ActivityBucketsState {
  state.buckets.loaded = true;
  state.buckets.afk = scope?.afk_buckets || [];
  state.buckets.window = scope?.window_buckets || [];
  state.buckets.browser = scope?.browser_buckets || [];
  state.buckets.editor = [];
  return state.buckets;
}

export function updateActivityAvailability(state: ActivityAvailabilityState): void {
  state.window.available = state.buckets.afk.length > 0 && state.buckets.window.length > 0;
  state.browser.available = state.window.available && state.buckets.browser.length > 0;
  state.editor.available = false;
  state.category.available = state.window.available;
}
