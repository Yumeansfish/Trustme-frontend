import {
  buildActivityDateSelectionRoute,
  buildResolvedActivityRoute,
  normalizeActivityRouteIfNeeded,
  pushActivityRouteIfChanged,
  pushActivityRouteWithPendingState,
  resolveCurrentActivityView,
  resolveCurrentActivityViewId,
} from '~/features/activity/lib/activityViewNavigation';

describe('activityViewNavigation', () => {
  test('resolves current view metadata', () => {
    const fallbackViews = [{ id: 'summary' }, { id: 'browser' }];

    expect(resolveCurrentActivityView(fallbackViews, 'browser')).toEqual({ id: 'browser' });
    expect(resolveCurrentActivityView(fallbackViews, 'missing')).toEqual({ id: 'summary' });
    expect(resolveCurrentActivityViewId({ id: 'browser' })).toBe('browser');
    expect(resolveCurrentActivityViewId(undefined)).toBe('');
  });

  test('builds routes from normalized activity state', () => {
    expect(
      buildResolvedActivityRoute({
        host: 'alpha.local',
        date: '2026-03-19',
        periodLength: 'week',
        subview: 'view',
        query: { category: 'Code' },
        requestedViewId: 'missing',
        fallbackViewId: 'summary',
        resolvedViews: [{ id: 'summary' }, { id: 'browser' }],
      })
    ).toEqual({
      name: 'activity-view',
      params: {
        host: 'alpha.local',
        periodLength: 'week',
        date: '2026-03-16',
        subview: 'view',
        view_id: 'summary',
      },
      query: { category: 'Code' },
    });

    expect(
      buildResolvedActivityRoute({
        host: 'alpha.local',
        date: '2026-03-19',
        endDate: '2026-03-23',
        periodLength: 'custom',
        subview: 'view',
        query: { category: 'Code' },
        requestedViewId: 'missing',
        fallbackViewId: 'summary',
        resolvedViews: [{ id: 'summary' }, { id: 'browser' }],
      })
    ).toEqual({
      name: 'activity-custom-view',
      params: {
        host: 'alpha.local',
        date: '2026-03-19',
        end: '2026-03-23',
        subview: 'view',
        view_id: 'summary',
      },
      query: { category: 'Code' },
    });
  });

  test('normalizes and pushes activity routes only when navigation is needed', async () => {
    const replace = jest.fn().mockResolvedValue(undefined);
    const push = jest.fn().mockResolvedValue(undefined);
    const router = {
      resolve: jest.fn(route => ({ fullPath: JSON.stringify(route) })),
      replace,
      push,
    };

    const expectedRoute = buildResolvedActivityRoute({
      host: 'alpha.local',
      date: '2026-03-19',
      periodLength: 'day',
      subview: 'view',
      query: {},
      requestedViewId: 'summary',
      fallbackViewId: 'summary',
      resolvedViews: [{ id: 'summary' }],
    });

    await expect(
      normalizeActivityRouteIfNeeded({
        router,
        route: {
          fullPath: '/wrong',
          query: {},
        },
        expectedRoute,
      })
    ).resolves.toBe(true);
    expect(replace).toHaveBeenCalledWith(expectedRoute);

    await expect(
      pushActivityRouteIfChanged({
        router,
        route: {
          fullPath: JSON.stringify(expectedRoute),
          query: {},
        },
        nextRoute: expectedRoute,
      })
    ).resolves.toBe(false);

    const nextRoute = buildActivityDateSelectionRoute({
      date: '2026-03-19',
      periodLength: 'month',
      normalizedPeriodLength: 'day',
      host: 'alpha.local',
      subview: 'view',
      query: { category: 'Code' },
      requestedViewId: 'summary',
      fallbackViewId: 'summary',
      resolvedViews: [{ id: 'summary' }],
    });

    expect(nextRoute).toEqual({
      name: 'activity-view',
      params: {
        host: 'alpha.local',
        periodLength: 'month',
        date: '2026-03-01',
        subview: 'view',
        view_id: 'summary',
      },
      query: { category: 'Code' },
    });

    await expect(
      pushActivityRouteIfChanged({
        router,
        route: {
          fullPath: '/current',
          query: {},
        },
        nextRoute: nextRoute!,
      })
    ).resolves.toBe(true);
    expect(push).toHaveBeenCalledWith(nextRoute);
  });

  test('clears pending state without pushing when Latest already targets the current route', async () => {
    const latestRoute = buildResolvedActivityRoute({
      host: 'alpha.local',
      date: '2026-03-19',
      periodLength: 'day',
      subview: 'view',
      query: {},
      requestedViewId: 'summary',
      fallbackViewId: 'summary',
      resolvedViews: [{ id: 'summary' }],
    });
    const push = jest.fn().mockResolvedValue(undefined);
    const startPending = jest.fn();
    const stopPending = jest.fn();
    const router = {
      resolve: jest.fn(route => ({ fullPath: JSON.stringify(route) })),
      replace: jest.fn().mockResolvedValue(undefined),
      push,
    };

    await expect(
      pushActivityRouteWithPendingState({
        router,
        route: { fullPath: JSON.stringify(latestRoute), query: {} },
        nextRoute: latestRoute,
        startPending,
        stopPending,
      })
    ).resolves.toBe(false);

    expect(startPending).toHaveBeenCalledTimes(1);
    expect(stopPending).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  test('keeps pending state active while a cross-day route change starts loading', async () => {
    const nextRoute = buildResolvedActivityRoute({
      host: 'alpha.local',
      date: '2026-03-19',
      periodLength: 'day',
      subview: 'view',
      query: {},
      requestedViewId: 'summary',
      fallbackViewId: 'summary',
      resolvedViews: [{ id: 'summary' }],
    });
    const push = jest.fn().mockResolvedValue(undefined);
    const startPending = jest.fn();
    const stopPending = jest.fn();
    const router = {
      resolve: jest.fn(route => ({ fullPath: JSON.stringify(route) })),
      replace: jest.fn().mockResolvedValue(undefined),
      push,
    };

    await expect(
      pushActivityRouteWithPendingState({
        router,
        route: { fullPath: '/activity/alpha.local/day/2026-03-18/view/summary', query: {} },
        nextRoute,
        startPending,
        stopPending,
      })
    ).resolves.toBe(true);

    expect(startPending).toHaveBeenCalledTimes(1);
    expect(stopPending).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(nextRoute);
  });

});
