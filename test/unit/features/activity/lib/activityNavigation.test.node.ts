import {
  buildActivityRouteDescriptor,
  buildViewTabRoute,
  normalizeDateSelection,
  readCategoryFilter,
  resolveActivityViewId,
  writeCategoryFilterQuery,
} from '~/features/activity/lib/activityNavigation';

describe('activityNavigation', () => {
  test('resolves activity view ids against available views', () => {
    const views = [{ id: 'summary' }, { id: 'buckets' }];
    expect(resolveActivityViewId(views, 'summary', 'buckets')).toBe('summary');
    expect(resolveActivityViewId(views, 'missing', 'buckets')).toBe('buckets');
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
    expect(normalizeDateSelection('2026-03-19', 'month', 'day')).toEqual({
      periodLength: 'month',
      date: '2026-03-01',
    });
    expect(normalizeDateSelection('not-a-date', 'month', 'day')).toBeNull();
  });

  test('builds route descriptors for activity view and tabs', () => {
    const descriptor = buildActivityRouteDescriptor({
      host: 'alpha.local',
      date: '2026-03-19',
      periodLength: 'week',
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
