const mockEnsureLoaded = jest.fn();
const mockFetchDashboardResolvedScope = jest.fn();
const mockAbort = jest.fn();
const mockSyncActivityScope = jest.fn();
const mockSyncActivityBuckets = jest.fn();
const mockUpdateActivityAvailability = jest.fn();
const mockShouldUseDashboardDtoFlow = jest.fn(() => true);

jest.mock('~/features/settings/store/settings', () => ({
  useSettingsStore: () => ({
    ensureLoaded: mockEnsureLoaded,
  }),
}));

jest.mock('~/features/activity-dashboard/store/dashboardClient', () => ({
  fetchDashboardResolvedScope: mockFetchDashboardResolvedScope,
}));

jest.mock('~/app/lib/awclient', () => ({
  getClient: () => ({
    abort: mockAbort,
  }),
}));

jest.mock('~/features/activity-dashboard/store/activityBucketRuntime', () => ({
  syncActivityScope: mockSyncActivityScope,
  syncActivityBuckets: mockSyncActivityBuckets,
  updateActivityAvailability: mockUpdateActivityAvailability,
}));

jest.mock('~/features/activity-dashboard/store/activityVisualizations', () => ({
  shouldUseDashboardDtoFlow: (...args: any[]) => mockShouldUseDashboardDtoFlow(...args),
}));

import { ensureActivityLoaded } from '~/features/activity-dashboard/store/activityCoordinator';
import type { QueryOptions } from '~/features/activity-dashboard/store/activityTypes';

function createStoreStub() {
  return {
    loaded: false,
    scope: {
      group_name: '',
      resolved_hosts: [],
      available_dates: [],
      earliest_available_date: '',
      latest_available_date: '',
    },
    window: { available: false },
    buckets: {
      loaded: false,
      afk: [],
      window: [],
      browser: [],
      editor: [],
    },
    isAbortError: jest.fn(() => false),
    isCurrentRequest: jest.fn(() => true),
    start_loading: jest.fn(() => 7),
    finish_loading: jest.fn(),
    query_dashboard_view: jest.fn(async () => undefined),
    query_window_completed: jest.fn(),
    query_browser_completed: jest.fn(),
    query_category_time_by_period_completed: jest.fn(),
    setActivityDataPath: jest.fn(),
    setActivityDataNotice: jest.fn(),
  } as any;
}

describe('activityCoordinator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ensureActivityLoaded routes supported queries through the dashboard dto path', async () => {
    mockFetchDashboardResolvedScope.mockResolvedValue({
      group_name: 'My macbook',
      resolved_hosts: ['alpha.local'],
      window_buckets: ['window-a'],
      afk_buckets: ['afk-a'],
      browser_buckets: ['browser-a'],
      stopwatch_buckets: ['stopwatch-a'],
      available_dates: ['2026-03-01'],
      earliest_available_date: '2026-03-01',
      latest_available_date: '2026-03-01',
    });
    mockUpdateActivityAvailability.mockImplementation((store: any) => {
      store.window.available = true;
    });

    const store = createStoreStub();
    const queryOptions: QueryOptions = {
      host: 'alpha.local',
      requested_visualizations: ['top_apps', 'top_domains'],
      timeperiod: {
        start: '2026-03-01T00:00:00.000Z',
        length: [1, 'day'],
      },
    };

    await ensureActivityLoaded(store, queryOptions);

    expect(mockEnsureLoaded).toHaveBeenCalled();
    expect(mockFetchDashboardResolvedScope).toHaveBeenCalledWith();
    expect(store.start_loading).toHaveBeenCalledWith(queryOptions);
    expect(mockSyncActivityScope).toHaveBeenCalled();
    expect(mockSyncActivityBuckets).toHaveBeenCalled();
    expect(store.query_dashboard_view).toHaveBeenCalledWith(queryOptions, 7);
    expect(store.finish_loading).toHaveBeenCalledWith(7);
    expect(store.setActivityDataPath).not.toHaveBeenCalledWith('legacy');
  });

  test('ensureActivityLoaded no longer falls back to legacy activity queries', async () => {
    mockFetchDashboardResolvedScope.mockResolvedValue({
      group_name: 'My macbook',
      resolved_hosts: ['alpha.local'],
      window_buckets: [],
      afk_buckets: [],
      browser_buckets: [],
      stopwatch_buckets: [],
      available_dates: [],
      earliest_available_date: '',
      latest_available_date: '',
    });
    mockUpdateActivityAvailability.mockImplementation((store: any) => {
      store.window.available = false;
    });

    const store = createStoreStub();
    const queryOptions: QueryOptions = {
      host: 'alpha.local',
      requested_visualizations: ['top_apps'],
      timeperiod: {
        start: '2026-03-01T00:00:00.000Z',
        length: [1, 'day'],
      },
    };

    await ensureActivityLoaded(store, queryOptions);

    expect(store.query_dashboard_view).toHaveBeenCalledWith(queryOptions, 7);
    expect(store.finish_loading).toHaveBeenCalledWith(7);
  });
});
