import {
  bootstrapActivityView,
  buildActivityQueryOptions,
  refreshActivityView,
  teardownActivityView,
  triggerReactiveActivityRefresh,
} from '~/features/activity-layouts/lib/activityViewRuntime';

describe('activityViewRuntime', () => {
  test('builds activity query options from view/runtime state', () => {
    expect(
      buildActivityQueryOptions({
        host: 'alpha.local%2Cbeta.local',
        timeperiod: { start: '2026-03-21T04:00:00+00:00', length: [1, 'day'] },
        periodMode: 'custom',
        force: true,
        filterAfk: true,
        includeAudible: false,
        filterCategories: [['Code']],
        alwaysActivePattern: 'Music',
        currentView: {
          elements: [{ type: 'top_apps' }, { type: 'category_donut' }],
        },
      })
    ).toEqual({
      timeperiod: { start: '2026-03-21T04:00:00+00:00', length: [1, 'day'] },
      period_mode: 'custom',
      host: 'alpha.local,beta.local',
      force: true,
      filter_afk: true,
      include_audible: false,
      filter_categories: [['Code']],
      dont_query_inactive: true,
      always_active_pattern: 'Music',
      requested_visualizations: ['top_apps', 'category_donut'],
    });
  });

  test('refresh clears highlight on force and swallows abort errors', async () => {
    const ensureLoaded = jest.fn().mockRejectedValueOnce(new Error('abort'));
    const clear = jest.fn();
    await expect(
      refreshActivityView({
        activityStore: {
          ensure_loaded: ensureLoaded,
          isAbortError: error => (error as Error).message === 'abort',
          reset: jest.fn(),
        },
        highlightStore: { clear },
        queryOptions: { host: 'alpha.local' },
        force: true,
      })
    ).resolves.toBeUndefined();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  test('bootstrap loads categories and tolerates canceled refresh', async () => {
    const log: string[] = [];
    await expect(
      bootstrapActivityView({
        normalizeRouteIfNeeded: jest.fn().mockResolvedValue(true),
        categoryStore: {
          load: jest.fn(() => {
            throw new Error('broken categories');
          }),
        },
        refresh: jest.fn().mockRejectedValue(new Error('canceled')),
        onError: message => log.push(message),
      })
    ).resolves.toBeUndefined();

    expect(log).toEqual(['Failed to load categories', 'Failed to refresh activity view']);
  });

  test('bootstrap rethrows non-canceled refresh errors', async () => {
    await expect(
      bootstrapActivityView({
        normalizeRouteIfNeeded: jest.fn().mockResolvedValue(true),
        categoryStore: { load: jest.fn() },
        refresh: jest.fn().mockRejectedValue(new Error('boom')),
        onError: jest.fn(),
      })
    ).rejects.toThrow('boom');
  });

  test('reactive refresh gate and teardown helpers delegate cleanly', async () => {
    const clear = jest.fn();
    const refresh = jest.fn();
    expect(
      triggerReactiveActivityRefresh({
        isBootstrapping: true,
        highlightStore: { clear },
        refresh,
      })
    ).toBe(false);
    expect(
      triggerReactiveActivityRefresh({
        isBootstrapping: false,
        highlightStore: { clear },
        refresh,
      })
    ).toBe(true);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);

    const reset = jest.fn().mockResolvedValue(undefined);
    await teardownActivityView({
      highlightStore: { clear },
      activityStore: {
        ensure_loaded: jest.fn(),
        isAbortError: jest.fn(),
        reset,
      },
    });
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
