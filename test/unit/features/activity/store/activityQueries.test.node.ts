import {
  commitActivitySummaryResult,
  completeEmptyActivityData,
  queryActivity,
} from '~/features/activity/store/activityQueries';
import type { QueryOptions } from '~/features/activity/store/activityTypes';

function createActivityStoreStub() {
  return {
    window: {
      available: false,
    },
    buckets: {
      loaded: true,
      afk: [],
      window: [],
      browser: [],
      editor: [],
    },
    setActivityDataPath: jest.fn(),
    setActivityDataNotice: jest.fn(),
    markActivityDataDegraded: jest.fn(),
    isCurrentRequest: jest.fn(() => true),
    query_window_completed: jest.fn(),
    query_browser_completed: jest.fn(),
    query_category_time_by_period_completed: jest.fn(),
    completeEmptyWindowData: jest.fn(),
    commitActivitySummary: jest.fn(),
    query_activity_browser: jest.fn(),
  } as any;
}

function createActivityQueryOptions(): QueryOptions {
  return {
    host: 'alpha.local',
    requested_visualizations: ['top_apps', 'top_domains', 'timeline_barchart'],
    timeperiod: {
      start: '2026-03-01T00:00:00.000Z',
      length: [1, 'day'],
    },
  };
}

describe('activityQueries', () => {
  test('completeEmptyActivityData clears all requested activity panels', () => {
    const store = createActivityStoreStub();

    completeEmptyActivityData(store, createActivityQueryOptions(), 11);

    expect(store.query_window_completed).toHaveBeenCalledWith(null, 11);
    expect(store.query_browser_completed).toHaveBeenCalledWith(
      { domains: [], urls: [], titles: [] },
      11
    );
    expect(store.query_category_time_by_period_completed).toHaveBeenCalledWith(
      { by_period: {} },
      11
    );
  });

  test('commitActivitySummaryResult writes summary panels and clears browser data', () => {
    const store = createActivityStoreStub();

    commitActivitySummaryResult(
      store,
      createActivityQueryOptions(),
      {
        window: {
          app_events: [
            { timestamp: '2026-03-01T10:00:00.000Z', duration: 60, data: { app: 'Code' } },
          ],
        },
        by_period: {
          periodA: {
            cat_events: [
              {
                timestamp: '2026-03-01T10:00:00.000Z',
                duration: 60,
                data: { $category: ['Code'] },
              },
            ],
          },
        },
      },
      12
    );

    expect(store.query_window_completed).toHaveBeenCalledWith(
      {
        app_events: [
          { timestamp: '2026-03-01T10:00:00.000Z', duration: 60, data: { app: 'Code' } },
        ],
      },
      12
    );
    expect(store.query_browser_completed).toHaveBeenCalledWith(
      { domains: [], urls: [], titles: [] },
      12
    );
    expect(store.query_category_time_by_period_completed).toHaveBeenCalledWith(
      {
        by_period: {
          periodA: {
            cat_events: [
              {
                timestamp: '2026-03-01T10:00:00.000Z',
                duration: 60,
                data: { $category: ['Code'] },
              },
            ],
          },
        },
      },
      12
    );
  });

  test('queryActivity renders explicit empty state when no window buckets are available', async () => {
    const store = createActivityStoreStub();

    await queryActivity(store, createActivityQueryOptions(), 13);

    expect(store.setActivityDataPath).toHaveBeenCalledWith('activity');
    expect(store.setActivityDataNotice).toHaveBeenCalledWith(null);
    expect(store.query_window_completed).toHaveBeenCalledWith(undefined, 13);
    expect(store.query_browser_completed).toHaveBeenCalledWith(
      { domains: [], urls: [], titles: [] },
      13
    );
    expect(store.query_category_time_by_period_completed).toHaveBeenCalledWith(
      { by_period: {} },
      13
    );
    expect(store.markActivityDataDegraded).not.toHaveBeenCalled();
  });
});
