import type { ActivityRefreshKind, QueryOptions, State } from './activityTypes';

export function isAbortActivityError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: string; name?: string; message?: string };
  const message = (maybeError.message || '').toLowerCase();
  return (
    maybeError.code === 'ERR_CANCELED' ||
    maybeError.name === 'CanceledError' ||
    message.includes('canceled') ||
    message.includes('aborted')
  );
}

export function isCurrentActivityRequest(
  state: Pick<State, 'active_request_nonce'>,
  requestNonce: number
): boolean {
  return requestNonce === state.active_request_nonce;
}

function clearActivityResults(state: State) {
  // Backend DTOs are fast enough now that keeping previous results while a new
  // request is in flight only adds state complexity and can cause stale crossovers.
  state.window.duration = 0;
  state.window.top_apps = null;

  state.browser.top_domains = null;
  state.browser.top_urls = null;
  state.browser.top_titles = null;

  state.editor.duration = 0;
  state.editor.top_files = null;
  state.editor.top_languages = null;
  state.editor.top_projects = null;

  state.category.top = null;
  state.category.by_period = null;
}

function classifyActivityRefreshKind(
  previousQueryOptions: QueryOptions | null,
  nextQueryOptions: QueryOptions,
  hadResolvedResults: boolean
): ActivityRefreshKind {
  if (!hadResolvedResults || !previousQueryOptions) {
    return 'hard';
  }

  if (previousQueryOptions.host !== nextQueryOptions.host) {
    return 'soft';
  }

  if (previousQueryOptions.period_mode !== nextQueryOptions.period_mode) {
    return 'soft';
  }

  return 'silent';
}

export function startActivityLoading(state: State, queryOptions: QueryOptions): number {
  const hadResolvedResults = state.query_options !== null;
  const refreshKind = classifyActivityRefreshKind(
    state.query_options,
    queryOptions,
    hadResolvedResults
  );

  state.loaded = true;
  state.is_initial_loading = refreshKind === 'hard';
  state.is_refreshing = hadResolvedResults;
  state.refresh_kind = refreshKind;
  state.query_options = queryOptions;
  state.request_nonce += 1;
  state.active_request_nonce = state.request_nonce;
  state.data_path = null;
  state.data_notice = null;

  if (!hadResolvedResults) {
    clearActivityResults(state);
  }

  return state.request_nonce;
}

export function finishActivityLoading(state: State, requestNonce: number) {
  if (!isCurrentActivityRequest(state, requestNonce)) {
    return;
  }

  state.is_initial_loading = false;
  state.is_refreshing = false;
  state.refresh_kind = null;
}

export function resetActivityRuntimeState(state: State) {
  state.request_nonce += 1;
  state.active_request_nonce = state.request_nonce;
  state.loaded = false;
  state.is_initial_loading = false;
  state.is_refreshing = false;
  state.refresh_kind = null;
  state.data_path = null;
  state.data_notice = null;
  state.query_options = null;
  state.scope.group_name = '';
  state.scope.resolved_hosts = [];
  state.scope.available_dates = null;
  state.scope.earliest_available_date = '';
  state.scope.latest_available_date = '';

  state.window.duration = 0;
  state.window.top_apps = [];

  state.browser.top_domains = [];
  state.browser.top_urls = [];
  state.browser.top_titles = [];

  state.editor.available = false;
  state.editor.duration = 0;
  state.editor.top_files = [];
  state.editor.top_languages = [];
  state.editor.top_projects = [];

  state.category.top = [];
  state.category.by_period = {};
}
