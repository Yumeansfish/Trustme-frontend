import {
  resolveActivityRedirectOutcome,
} from '~/features/activity/lib/activityRedirect';
import { resolveDefaultViewId } from '~/features/activity-layouts/lib/activityViewCatalog';

describe('activity redirect helper', () => {
  test('falls back to the default summary view when configured views are empty', () => {
    expect(resolveDefaultViewId([])).toBe('summary');
  });

  test('builds an activity route when default hosts are available', () => {
    expect(
      resolveActivityRedirectOutcome({
        activityScope: {
          group_name: 'My macbook',
          resolved_hosts: ['workstation', 'laptop'],
          window_buckets: ['window'],
          afk_buckets: ['afk'],
          browser_buckets: [],
          stopwatch_buckets: [],
          available_dates: [],
          earliest_available_date: '',
          latest_available_date: '',
        },
        date: '2026-03-21',
      })
    ).toEqual({
      kind: 'redirect',
      path: '/activity/My%20macbook/day/2026-03-21/view/summary',
    });
  });

  test('returns a setup state when no default hosts are configured', () => {
    expect(
      resolveActivityRedirectOutcome({
        activityScope: {
          group_name: '',
          resolved_hosts: [],
          window_buckets: [],
          afk_buckets: [],
          browser_buckets: [],
          stopwatch_buckets: [],
          available_dates: [],
          earliest_available_date: '',
          latest_available_date: '',
        },
        date: '2026-03-21',
      })
    ).toEqual({
      kind: 'empty',
      reason: 'missing-hosts',
      title: 'Activity needs watcher data before it can open',
      message:
        'No complete window and AFK watcher pair exists yet. Open buckets to inspect the raw watcher data.',
    });
  });

  test('returns an error state when dashboard defaults cannot be loaded', () => {
    expect(
      resolveActivityRedirectOutcome({
        activityScope: null,
        date: '2026-03-21',
      })
    ).toEqual({
      kind: 'empty',
      reason: 'load-failed',
      title: 'Activity could not load its MacBook scope',
      message:
        'The app could not get the Activity scope from the backend. Retry, or inspect buckets directly while the backend settles down.',
    });
  });
});
