import { createInitialActivityState } from '~/features/activity-dashboard/store/activityState';
import {
  finishActivityLoading,
  isAbortActivityError,
  isCurrentActivityRequest,
  resetActivityRuntimeState,
  startActivityLoading,
} from '~/features/activity-dashboard/store/activityRequestLifecycle';

describe('activityRequestLifecycle', () => {
  test('isAbortActivityError recognizes canceled request variants', () => {
    expect(isAbortActivityError({ code: 'ERR_CANCELED' })).toBe(true);
    expect(isAbortActivityError({ name: 'CanceledError' })).toBe(true);
    expect(isAbortActivityError({ message: 'request aborted by client' })).toBe(true);
    expect(isAbortActivityError({ message: 'boom' })).toBe(false);
  });

  test('startActivityLoading advances the nonce and clears stale results on first load', () => {
    const state = createInitialActivityState();
    state.request_nonce = 4;
    state.active_request_nonce = 4;
    state.data_path = 'dashboard';
    state.data_notice = {
      variant: 'warning',
      title: 'old',
      message: 'stale',
      items: ['one'],
    };
    state.window.top_apps = [{ duration: 10, data: { app: 'Code' } } as any];
    state.browser.top_domains = [{ duration: 10, data: { $domain: 'example.com' } } as any];
    state.editor.top_files = [{ duration: 10, data: { file: 'main.ts' } } as any];
    state.category.by_period = { periodA: { cat_events: [] } };

    const nonce = startActivityLoading(state, { host: 'alpha.local' });

    expect(nonce).toBe(5);
    expect(state.active_request_nonce).toBe(5);
    expect(state.query_options).toEqual({ host: 'alpha.local' });
    expect(state.data_path).toBeNull();
    expect(state.data_notice).toBeNull();
    expect(state.window.top_apps).toBeNull();
    expect(state.browser.top_domains).toBeNull();
    expect(state.editor.top_files).toBeNull();
    expect(state.category.by_period).toBeNull();
    expect(state.is_initial_loading).toBe(true);
    expect(state.is_refreshing).toBe(false);
    expect(state.refresh_kind).toBe('hard');
    expect(isCurrentActivityRequest(state, nonce)).toBe(true);
    expect(isCurrentActivityRequest(state, nonce - 1)).toBe(false);
  });

  test('startActivityLoading preserves existing results after the first resolved load', () => {
    const state = createInitialActivityState();
    state.loaded = true;
    state.query_options = { host: 'alpha.local' };
    state.request_nonce = 9;
    state.active_request_nonce = 9;
    state.window.top_apps = [{ duration: 10, data: { app: 'Code' } } as any];
    state.browser.top_domains = [{ duration: 10, data: { $domain: 'example.com' } } as any];
    state.category.by_period = { periodA: { cat_events: [] } };

    const nonce = startActivityLoading(state, { host: 'beta.local' });

    expect(nonce).toBe(10);
    expect(state.active_request_nonce).toBe(10);
    expect(state.query_options).toEqual({ host: 'beta.local' });
    expect(state.window.top_apps).toEqual([{ duration: 10, data: { app: 'Code' } }]);
    expect(state.browser.top_domains).toEqual([
      { duration: 10, data: { $domain: 'example.com' } },
    ]);
    expect(state.category.by_period).toEqual({ periodA: { cat_events: [] } });
    expect(state.is_initial_loading).toBe(false);
    expect(state.is_refreshing).toBe(true);
    expect(state.refresh_kind).toBe('soft');
  });

  test('startActivityLoading uses silent refresh for same-mode range updates', () => {
    const state = createInitialActivityState();
    state.loaded = true;
    state.query_options = { host: 'alpha.local', period_mode: 'month' };

    startActivityLoading(state, { host: 'alpha.local', period_mode: 'month' });

    expect(state.is_initial_loading).toBe(false);
    expect(state.is_refreshing).toBe(true);
    expect(state.refresh_kind).toBe('silent');
  });

  test('finishActivityLoading clears transient loading flags for the active request', () => {
    const state = createInitialActivityState();
    const nonce = startActivityLoading(state, { host: 'alpha.local' });

    finishActivityLoading(state, nonce);

    expect(state.is_initial_loading).toBe(false);
    expect(state.is_refreshing).toBe(false);
    expect(state.refresh_kind).toBeNull();
  });

  test('resetActivityRuntimeState clears the loaded request state', () => {
    const state = createInitialActivityState();
    state.loaded = true;
    state.query_options = { host: 'alpha.local' };
    state.editor.available = true;
    state.category.top = null;

    resetActivityRuntimeState(state);

    expect(state.loaded).toBe(false);
    expect(state.query_options).toBeNull();
    expect(state.is_initial_loading).toBe(false);
    expect(state.is_refreshing).toBe(false);
    expect(state.refresh_kind).toBeNull();
    expect(state.editor.available).toBe(false);
    expect(state.category.top).toEqual([]);
  });
});
