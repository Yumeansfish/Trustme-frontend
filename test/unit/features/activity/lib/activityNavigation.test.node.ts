import {
  buildActivityRouteDescriptor,
  buildCalendarSelectionHash,
  buildViewTabRoute,
  normalizeDateSelection,
  readCategoryFilter,
  resolveActivityViewId,
  serializeRouteQuery,
  writeCategoryFilterQuery,
} from '~/features/activity/lib/activityNavigation';

describe('activityNavigation', () => {
  test('resolves activity view ids against available views', () => {
    const views = [{ id: 'summary' }, { id: 'buckets' }];
    expect(resolveActivityViewId(views, 'summary', 'buckets')).toBe('summary');
    expect(resolveActivityViewId(views, 'missing', 'buckets')).toBe('buckets');
  });

  test('serializes route query and calendar hash', () => {
    const query = { category: 'Code>Debug', tags: ['one', 'two'], empty: null };
    expect(serializeRouteQuery(query)).toBe('category=Code%3EDebug&tags=one&tags=two');
    expect(
      buildCalendarSelectionHash({
        host: 'alpha.local,beta.local',
        date: '2026-03-19',
        startOfWeek: 'Monday',
        activeViewId: 'summary',
        query,
      })
    ).toBe(
      '#/activity/alpha.local%2Cbeta.local/day/2026-03-19/view/summary?category=Code%3EDebug&tags=one&tags=two'
    );
  });

  test('reads and writes category filters in route query', () => {
    expect(readCategoryFilter({})).toBeNull();
    expect(readCategoryFilter({ category: 'Code>Debug' })).toEqual(['Code', 'Debug']);
    expect(writeCategoryFilterQuery({ category: 'Code', page: '1' }, null)).toEqual({
      page: '1',
    });
    expect(writeCategoryFilterQuery({ page: '1' }, ['Code', 'Debug'])).toEqual({
      page: '1',
      category: 'Code>Debug',
    });
  });

  test('normalizes date selection for browseable periods', () => {
    expect(normalizeDateSelection('2026-03-19', 'month', 'day', 'Monday')).toEqual({
      periodLength: 'month',
      date: '2026-03-01',
    });
    expect(normalizeDateSelection('not-a-date', 'month', 'day', 'Monday')).toBeNull();
  });

  test('builds route descriptors for activity view and tabs', () => {
    const descriptor = buildActivityRouteDescriptor({
      host: 'alpha.local',
      date: '2026-03-19',
      periodLength: 'week',
      startOfWeek: 'Monday',
      subview: 'view',
      query: { category: 'Code' },
      requestedViewId: 'missing',
      fallbackViewId: 'summary',
      resolvedViews: [{ id: 'summary' }, { id: 'buckets' }],
    });

    expect(descriptor).toEqual({
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
      buildViewTabRoute({
        route: {
          name: 'activity-view',
          params: { host: 'alpha.local', periodLength: 'day' },
          query: { category: 'Code' },
        },
        viewId: 'buckets',
      })
    ).toEqual({
      name: 'activity-view',
      params: { host: 'alpha.local', periodLength: 'day', view_id: 'buckets' },
      query: { category: 'Code' },
    });

    expect(
      buildActivityRouteDescriptor({
        host: 'alpha.local',
        date: '2026-03-19',
        endDate: '2026-03-23',
        periodLength: 'custom',
        startOfWeek: 'Monday',
        subview: 'view',
        query: { category: 'Code' },
        requestedViewId: 'missing',
        fallbackViewId: 'summary',
        resolvedViews: [{ id: 'summary' }, { id: 'buckets' }],
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

    expect(
      buildViewTabRoute({
        route: {
          name: 'activity-custom-view',
          params: { host: 'alpha.local', date: '2026-03-19', end: '2026-03-23' },
          query: { category: 'Code' },
        },
        viewId: 'buckets',
      })
    ).toEqual({
      name: 'activity-custom-view',
      params: {
        host: 'alpha.local',
        date: '2026-03-19',
        end: '2026-03-23',
        view_id: 'buckets',
      },
      query: { category: 'Code' },
    });
  });
});
