const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('~/app/lib/awclient', () => ({
  getClient: () => ({
    req: {
      get: mockGet,
      post: mockPost,
    },
  }),
}));

import { fetchCounterfactual, fetchInsights, normalizeInsightsReport } from '~/features/insights/lib/insightsClient';

describe('Insights API client', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  test('loads one persisted report and normalizes available dates', async () => {
    mockGet.mockResolvedValue({
      data: {
        available_dates: ['2026-07-20', 'invalid', '2026-07-19', '2026-07-20'],
        reports: [{
          id: '1300-1400-afternoon',
          checkin_session: 'afternoon', suggestions_available_at: '2026-07-20T14:00:00+02:00',
          feedback_available_at: null, confirmation: null,
          date: '2026-07-20',
          period_start: '2026-07-20T13:00:00+02:00',
          period_end: '2026-07-20T14:00:00+02:00',
          results: [
            {
              id: 'q8',
              title: 'Stress',
              score: 4.5,
              scale: {
                min: 0,
                max: 6,
                min_label: 'Not at all',
                max_label: 'Very',
              },
              has_counterfactual: true,
            },
            {
              id: 'arousal',
              title: 'Energy / intensity',
              score: 3,
              scale: {
                min: 0,
                max: 6,
                min_label: 'Low intensity',
                max_label: 'High intensity',
              },
              has_counterfactual: false,
            },
          ],
        }],
      },
    });

    const payload = await fetchInsights('2026-07-20');

    expect(mockGet).toHaveBeenCalledWith('/0/dashboard/model-output', {
      params: { date: '2026-07-20' },
    });
    expect(payload.available_dates).toEqual(['2026-07-19', '2026-07-20']);
    expect(payload.reports[0]?.results[0]).toMatchObject({
      id: 'q8',
      score: 4.5,
      has_counterfactual: true,
    });
    expect(payload.reports[0]?.results[1]).toMatchObject({
      id: 'arousal',
      title: 'Energy',
      score: 3,
    });
  });

  test('rejects a malformed report instead of showing the empty state', async () => {
    mockGet.mockResolvedValue({
      data: {
        available_dates: [],
        reports: [{ date: '2026-07-20' }],
      },
    });

    await expect(fetchInsights('2026-07-20')).rejects.toThrow('Invalid insight report');
  });

  test('requests one automatic counterfactual for a semantic target', async () => {
    mockPost.mockResolvedValue({
      data: {
        target: 'stress_management',
        strength: 'Improve slightly',
        shifts: [
          {
            category: 'media',
            title: 'Media',
            current_minutes: 20,
            delta_minutes: -5,
          },
          {
            category: 'research',
            title: 'Research',
            current_minutes: 10,
            delta_minutes: 5,
          },
        ],
      },
    });

    await expect(
      fetchCounterfactual('2026-07-20', '1300-1400', 'stress_management')
    ).resolves.toMatchObject({
      target: 'stress_management',
      strength: 'Improve slightly',
      shifts: [{ title: 'Media' }, { title: 'Research' }],
    });
    expect(mockPost).toHaveBeenCalledWith('/0/dashboard/model-output/counterfactual', {
      date: '2026-07-20',
      period_id: '1300-1400',
      target: 'stress_management',
    });
  });
});

test.each([undefined, null, '3', NaN, Infinity])('does not turn an invalid score %p into zero', score => {
  expect(() => normalizeInsightsReport({
    id: '0859-0959-morning', date: '2026-09-06',
    checkin_session: 'morning', suggestions_available_at: '2026-09-06T09:59:00+02:00',
    feedback_available_at: null, confirmation: null,
    period_start: '2026-09-06T08:59:00+02:00', period_end: '2026-09-06T09:59:00+02:00',
    results: [{
      id: 'productivity', title: 'Work productivity', score, has_counterfactual: false,
      scale: { min: 0, max: 6, min_label: 'Low', max_label: 'High' },
    }],
  })).toThrow('Invalid numeric value');
});

test.each([null, {}, { reports: null }, { reports: {} }])(
  'rejects a malformed insights response %p', async data => {
    mockGet.mockResolvedValue({ data });
    await expect(fetchInsights()).rejects.toThrow('Invalid insights response');
  }
);

test('keeps a genuinely empty day as the empty state', async () => {
  mockGet.mockResolvedValue({ data: { available_dates: [], reports: [] } });
  await expect(fetchInsights()).resolves.toEqual({ available_dates: [], reports: [] });
});

test('preserves check-in confirmation and its initially unset feedback time', () => {
  const report = {
    id: '0907-1007-morning', date: '2026-09-07',
    period_start: '2026-09-07T09:07:00+02:00', period_end: '2026-09-07T10:07:00+02:00',
    results: [], checkin_session: 'morning', suggestions_available_at: '2026-09-07T10:07:02+02:00',
    confirmation: { required_targets: ['productivity'], confirmed_targets: [],
      confirm_by: '2026-09-07T11:00:00+02:00', session_ends_at: '2026-09-07T12:00:00+02:00',
      feedback_available_at: null }, feedback_available_at: null,
  };
  expect(normalizeInsightsReport(report)).toEqual(report);
});

test.each([undefined, {}, { required_targets: ['productivity'], confirmed_targets: 'wrong' }])(
  'rejects malformed confirmation %p', confirmation => {
    expect(() => normalizeInsightsReport({
      id: '0900-1000-morning', date: '2026-09-07',
      period_start: '2026-09-07T09:00:00+02:00', period_end: '2026-09-07T10:00:00+02:00',
      checkin_session: 'morning', suggestions_available_at: '2026-09-07T10:00:05+02:00',
      feedback_available_at: null, confirmation, results: [],
    })).toThrow('Invalid insight confirmation');
  }
);
