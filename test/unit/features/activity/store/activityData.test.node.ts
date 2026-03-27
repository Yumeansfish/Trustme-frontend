import fs from 'fs';
import path from 'path';

const mockPost = jest.fn();

jest.mock('~/app/lib/awclient', () => ({
  getClientAbortSignal: () => undefined,
  getClient: () => ({
    req: {
      post: mockPost,
      defaults: { timeout: 0 },
    },
  }),
}));

import {
  buildCompactSummaryLogicalPeriods,
  buildCompactSummarySnapshotPeriods,
  buildExecutionQueryPeriods,
} from '~/features/activity-dashboard/store/activityData';
import {
  fetchDashboardDetails,
  fetchDashboardResolvedScope,
  fetchDashboardSummarySnapshot,
} from '~/features/activity-dashboard/store/dashboardClient';
import { shouldUseDashboardDtoFlow } from '~/features/activity-dashboard/store/activityVisualizations';
import type { QueryOptions } from '~/features/activity-dashboard/store/activityTypes';
import type { TimePeriod } from '~/app/lib/timeperiod';

function loadDashboardFixture(name: string) {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'test', 'fixtures', 'dashboard', name), 'utf8')
  );
}

describe('activityData helpers', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  test('buildExecutionQueryPeriods trims an open period to now', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-03-01T12:00:00.000Z').getTime());

    const timeperiod: TimePeriod = {
      start: '2026-03-01T00:00:00.000Z',
      length: [1, 'day'],
    };

    const [period] = buildExecutionQueryPeriods(timeperiod);
    const [startIso, endIso] = period.split('/');

    expect(new Date(startIso).toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(endIso).toBe('2026-03-01T12:00:00.000Z');

    jest.restoreAllMocks();
  });

  test('custom single-day ranges use hourly buckets', () => {
    const timeperiod: TimePeriod = {
      start: '2026-03-01T00:00:00.000Z',
      length: [1, 'day'],
    };

    const snapshotPeriods = buildCompactSummarySnapshotPeriods(timeperiod, 'custom');
    expect(snapshotPeriods).toHaveLength(24);

    const [startIso, endIso] = snapshotPeriods[0].split('/');
    expect(new Date(endIso).getTime() - new Date(startIso).getTime()).toBe(60 * 60 * 1000);

    expect(buildCompactSummaryLogicalPeriods(timeperiod, 'custom')).toHaveLength(24);
  });

  test('fetchDashboardSummarySnapshot normalizes DTO payloads', async () => {
    const fixture = loadDashboardFixture('dashboard-summary-grouped-multidevice.json');
    mockPost.mockResolvedValue({ data: fixture });

    const result = await fetchDashboardSummarySnapshot({
      range: {
        start: new Date('2026-03-02T08:00:00.000Z'),
        end: new Date('2026-03-02T10:00:00.000Z'),
        period: '2026-03-02T08:00:00+00:00/2026-03-02T09:00:00+00:00',
      },
      categoryPeriods: Object.keys(fixture.by_period),
      filterAfk: true,
      filterCategories: [],
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/0/dashboard/summary-snapshot',
      {
        range: {
          start: '2026-03-02T08:00:00.000Z',
          end: '2026-03-02T10:00:00.000Z',
        },
        category_periods: Object.keys(fixture.by_period),
        filter_afk: true,
        filter_categories: [],
      },
      undefined
    );
    expect(result).toEqual(fixture);
  });

  test('fetchDashboardSummarySnapshot keeps the empty-state contract fixture stable', async () => {
    const fixture = loadDashboardFixture('dashboard-summary-empty.json');
    mockPost.mockResolvedValue({ data: fixture });

    const result = await fetchDashboardSummarySnapshot({
      range: {
        start: new Date('2026-03-01T10:00:00.000Z'),
        end: new Date('2026-03-01T12:00:00.000Z'),
        period: '2026-03-01T10:00:00+00:00/2026-03-01T11:00:00+00:00',
      },
      categoryPeriods: Object.keys(fixture.by_period),
      filterAfk: true,
      filterCategories: [],
    });

    expect(result).toEqual(fixture);
  });

  test('fetchDashboardDetails and scope normalize mirrored contract fixtures', async () => {
    const detailsFixture = loadDashboardFixture('dashboard-details-browser.json');
    const scopeFixture = loadDashboardFixture('dashboard-scope-grouped-multidevice.json');

    mockPost
      .mockResolvedValueOnce({ data: detailsFixture })
      .mockResolvedValueOnce({ data: scopeFixture });

    const details = await fetchDashboardDetails({
      range: {
        start: new Date('2026-03-02T08:00:00.000Z'),
        end: new Date('2026-03-02T11:00:00.000Z'),
        period: 'periodA',
      },
    });
    const scope = await fetchDashboardResolvedScope();

    expect(details).toEqual(detailsFixture);
    expect(scope).toEqual({
      group_name: '',
      resolved_hosts: scopeFixture.resolved_hosts,
      window_buckets: scopeFixture.window_buckets,
      afk_buckets: scopeFixture.afk_buckets,
      browser_buckets: scopeFixture.browser_buckets,
      stopwatch_buckets: scopeFixture.stopwatch_buckets,
      available_dates: [],
      earliest_available_date: '',
      latest_available_date: '',
    });
  });

  test('fetchDashboardSummarySnapshot backfills partial payloads from ad-hoc responses', async () => {
    mockPost.mockResolvedValue({
      data: {
        window: {
          app_events: [{ timestamp: '2026-03-01T10:00:00Z', duration: 120, data: { app: 'Code' } }],
          duration: 120,
        },
        by_period: {
          periodA: {
            cat_events: [
              { timestamp: '2026-03-01T10:00:00Z', duration: 120, data: { $category: ['Code'] } },
            ],
          },
          periodB: {},
        },
      },
    });

    const result = await fetchDashboardSummarySnapshot({
      range: {
        start: new Date('2026-03-01T10:00:00.000Z'),
        end: new Date('2026-03-01T11:00:00.000Z'),
        period: 'periodA',
      },
      categoryPeriods: ['periodA', 'periodB'],
      filterAfk: true,
      filterCategories: [],
    });

    expect(result?.window.app_events[0].data.app).toBe('Code');
    expect(result?.by_period.periodB).toEqual({ cat_events: [] });
  });

  test('dashboard DTO flow stays on the supported path for dashboard and standalone views', () => {
    const dashboardQuery: QueryOptions = {
      host: 'alpha.local',
      requested_visualizations: ['top_apps', 'timeline_barchart', 'top_domains'],
    };
    const standaloneOnlyQuery: QueryOptions = {
      host: 'alpha.local',
      requested_visualizations: [],
    };

    expect(shouldUseDashboardDtoFlow(dashboardQuery)).toBe(true);
    expect(shouldUseDashboardDtoFlow(standaloneOnlyQuery)).toBe(true);
  });
});
