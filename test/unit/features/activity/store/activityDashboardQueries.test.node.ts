import {
  commitDashboardSnapshotResult,
  completeEmptyDashboardWindowData,
  queryDashboardView,
} from '~/features/activity-dashboard/store/activityDashboardQueries';
import type { QueryOptions } from '~/features/activity-dashboard/store/activityTypes';

function createDashboardStoreStub() {
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
    markDashboardDegraded: jest.fn(),
    isCurrentRequest: jest.fn(() => true),
    query_window_completed: jest.fn(),
    query_browser_completed: jest.fn(),
    query_category_time_by_period_completed: jest.fn(),
    completeEmptyWindowData: jest.fn(),
    commitDashboardSnapshot: jest.fn(),
    query_dashboard_details: jest.fn(),
  } as any;
}

function createDashboardQueryOptions(): QueryOptions {
  return {
    host: 'alpha.local',
    requested_visualizations: ['top_apps', 'top_domains', 'timeline_barchart'],
    timeperiod: {
      start: '2026-03-01T00:00:00.000Z',
      length: [1, 'day'],
    },
  };
}

describe('activityDashboardQueries', () => {
  test('completeEmptyDashboardWindowData clears all requested dashboard panels', () => {
    const store = createDashboardStoreStub();

    completeEmptyDashboardWindowData(store, createDashboardQueryOptions(), 11);

    expect(store.query_window_completed).toHaveBeenCalledWith({}, 11);
    expect(store.query_browser_completed).toHaveBeenCalledWith(
      { domains: [], urls: [], titles: [] },
      11
    );
    expect(store.query_category_time_by_period_completed).toHaveBeenCalledWith(
      { by_period: {} },
      11
    );
  });

  test('commitDashboardSnapshotResult writes snapshot-backed panels and clears dependent details', () => {
    const store = createDashboardStoreStub();

    commitDashboardSnapshotResult(
      store,
      createDashboardQueryOptions(),
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

  test('queryDashboardView renders explicit empty dashboard state when no window buckets are available', async () => {
    const store = createDashboardStoreStub();

    await queryDashboardView(store, createDashboardQueryOptions(), 13);

    expect(store.setActivityDataPath).toHaveBeenCalledWith('dashboard');
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
    expect(store.markDashboardDegraded).not.toHaveBeenCalled();
  });
});
