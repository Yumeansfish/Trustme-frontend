import { createInitialActivityState } from '~/features/activity/store/activityState';
import {
  syncActivityScope,
  syncActivityBuckets,
  updateActivityAvailability,
} from '~/features/activity/store/activityBucketRuntime';

describe('activityBucketRuntime', () => {
  test('syncActivityScope stores backend-owned group scope and availability', () => {
    const state = createInitialActivityState();

    syncActivityScope(state, {
      group_name: 'MacBook',
      resolved_hosts: ['alpha.local'],
      window_buckets: ['window:resolved'],
      afk_buckets: ['afk:resolved'],
      browser_buckets: ['browser:resolved'],
      stopwatch_buckets: ['stopwatch:resolved'],
      available_dates: ['2026-03-01', '2026-03-03'],
      earliest_available_date: '2026-03-01',
      latest_available_date: '2026-03-03',
    });

    expect(state.scope.group_name).toBe('MacBook');
    expect(state.scope.resolved_hosts).toEqual(['alpha.local']);
    expect(state.scope.available_dates).toEqual(['2026-03-01', '2026-03-03']);
  });

  test('syncActivityBuckets prefers backend-owned scope buckets', () => {
    const state = createInitialActivityState();

    syncActivityBuckets(state, {
      group_name: 'MacBook',
      resolved_hosts: ['alpha.local'],
      window_buckets: ['window:resolved'],
      afk_buckets: ['afk:resolved'],
      browser_buckets: ['browser:resolved'],
      stopwatch_buckets: ['stopwatch:resolved'],
      available_dates: [],
      earliest_available_date: '',
      latest_available_date: '',
    });

    expect(state.buckets.window).toEqual(['window:resolved']);
    expect(state.buckets.afk).toEqual(['afk:resolved']);
    expect(state.buckets.browser).toEqual(['browser:resolved']);
    expect(state.buckets.editor).toEqual([]);
  });

  test('syncActivityBuckets and updateActivityAvailability keep bucket state and flags aligned', () => {
    const state = createInitialActivityState();

    syncActivityBuckets(state, {
      group_name: 'MacBook',
      resolved_hosts: ['alpha.local'],
      window_buckets: ['window:resolved'],
      afk_buckets: ['afk:resolved'],
      browser_buckets: ['browser:resolved'],
      stopwatch_buckets: ['stopwatch:resolved'],
      available_dates: [],
      earliest_available_date: '',
      latest_available_date: '',
    });
    updateActivityAvailability(state);

    expect(state.buckets.window).toEqual(['window:resolved']);
    expect(state.window.available).toBe(true);
    expect(state.browser.available).toBe(true);
  });

  test('distinguishes scope fallback from an authoritative empty date set', () => {
    const fallbackState = createInitialActivityState();
    syncActivityScope(fallbackState, null);
    expect(fallbackState.scope.available_dates).toBeUndefined();

    const resolvedState = createInitialActivityState();
    syncActivityScope(resolvedState, {
      group_name: 'alpha.local',
      resolved_hosts: ['alpha.local'],
      window_buckets: [],
      afk_buckets: [],
      browser_buckets: [],
      stopwatch_buckets: [],
      available_dates: [],
      earliest_available_date: '',
      latest_available_date: '',
    });
    expect(resolvedState.scope.available_dates).toEqual([]);
  });
});
