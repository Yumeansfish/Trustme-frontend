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
  buildCompactSummaryPeriods,
  buildExecutionQueryPeriods,
} from '~/features/activity/store/activityData';
import {
  fetchSummary,
} from '~/features/summary/lib/summaryClient';
import { fetchBrowserActivity } from '~/features/browser/lib/browserClient';
import { fetchActivityScope } from '~/features/activity/lib/activityScopeClient';
import { shouldUseActivityDataFlow } from '~/features/activity/store/activityQueryPlan';
import type { QueryOptions } from '~/features/activity/store/activityTypes';
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

    const summaryPeriods = buildCompactSummaryPeriods(timeperiod, 'custom');
    expect(summaryPeriods).toHaveLength(24);

    const [startIso, endIso] = summaryPeriods[0].split('/');
    expect(new Date(endIso).getTime() - new Date(startIso).getTime()).toBe(60 * 60 * 1000);

    expect(buildCompactSummaryLogicalPeriods(timeperiod, 'custom')).toHaveLength(24);
  });

  test('fetchDashboardSummary normalizes DTO payloads', async () => {
    const fixture = loadDashboardFixture('dashboard-summary-grouped-multidevice.json');
    mockPost.mockResolvedValue({ data: fixture });

    const result = await fetchSummary({
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
      '/0/dashboard/summary',
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

  test('fetchDashboardSummary keeps the empty-state contract fixture stable', async () => {
    const fixture = loadDashboardFixture('dashboard-summary-empty.json');
    mockPost.mockResolvedValue({ data: fixture });

    const result = await fetchSummary({
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

  test('fetchDashboardBrowser and scope normalize mirrored contract fixtures', async () => {
    const browserFixture = loadDashboardFixture('dashboard-browser.json');
    const scopeFixture = loadDashboardFixture('dashboard-scope-grouped-multidevice.json');

    mockPost
      .mockResolvedValueOnce({ data: browserFixture })
      .mockResolvedValueOnce({ data: scopeFixture });

    const browser = await fetchBrowserActivity({
      range: {
        start: new Date('2026-03-02T08:00:00.000Z'),
        end: new Date('2026-03-02T11:00:00.000Z'),
        period: 'periodA',
      },
    });
    const scope = await fetchActivityScope();

    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/0/dashboard/browser',
      {
        range: {
          start: '2026-03-02T08:00:00.000Z',
          end: '2026-03-02T11:00:00.000Z',
        },
      },
      undefined
    );
    expect(mockPost).toHaveBeenNthCalledWith(2, '/0/dashboard/scope', {}, undefined);
    expect(browser).toEqual(browserFixture);
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

  test('fetchDashboardSummary rejects incomplete responses instead of backfilling', async () => {
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

    await expect(fetchSummary({
      range: {
        start: new Date('2026-03-01T10:00:00.000Z'),
        end: new Date('2026-03-01T11:00:00.000Z'),
        period: 'periodA',
      },
      categoryPeriods: ['periodA', 'periodB'],
      filterAfk: true,
      filterCategories: [],
    })).rejects.toThrow('Invalid activity event list');


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

    expect(shouldUseActivityDataFlow(dashboardQuery)).toBe(true);
    expect(shouldUseActivityDataFlow(standaloneOnlyQuery)).toBe(true);
  });
});

test.each([{}, { domains: [], urls: [], titles: null }, { domains: [{}], urls: [], titles: [] }])(
  'rejects malformed browser payload %p', async data => {
    mockPost.mockResolvedValue({ data });
    await expect(fetchBrowserActivity({ range: {
      start: new Date('2026-09-07T09:00:00Z'), end: new Date('2026-09-07T10:00:00Z'), period: 'hour',
    } })).rejects.toThrow('Invalid activity event list');
  }
);

test.each([{}, { ...loadDashboardFixture('dashboard-scope-grouped-multidevice.json'), resolved_hosts: [null] }])(
  'rejects malformed scope payload %p', async data => {
    mockPost.mockResolvedValue({ data });
    await expect(fetchActivityScope()).rejects.toThrow('Invalid activity scope');
  }
);
