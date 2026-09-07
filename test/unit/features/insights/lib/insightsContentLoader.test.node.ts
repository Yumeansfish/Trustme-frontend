import type {
  ModelOutputReport,
  ModelOutputResponse,
} from '~/shared/contracts/model-output.generated';
import { loadInsightsContent } from '~/features/insights/lib/insightsContentLoader';

function report(date: string, periodId = '1400-1500'): ModelOutputReport {
  const [start, end] = periodId.split('-');
  return {
    id: periodId,
    date,
    period_start: `${date}T${start.slice(0, 2)}:${start.slice(2)}:00+02:00`,
    period_end: `${date}T${end.slice(0, 2)}:${end.slice(2)}:00+02:00`,
    results: [],
  };
}

function payload(
  availableDates: string[],
  selectedReports: ModelOutputReport[]
): ModelOutputResponse {
  return {
    available_dates: availableDates,
    reports: selectedReports,
  };
}

describe('Insights embedded content loader', () => {
  test('uses the preferred day when its prediction exists', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        payload(
          ['2026-07-20', '2026-07-21'],
          [report('2026-07-21', '1200-1300'), report('2026-07-21', '1000-1100')]
        )
      );

    await expect(loadInsightsContent('2026-07-21', fetcher)).resolves.toEqual({
      availableDates: ['2026-07-20', '2026-07-21'],
      resolvedDate: '2026-07-21',
      reports: [report('2026-07-21', '1000-1100'), report('2026-07-21', '1200-1300')],
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('2026-07-21');
  });

  test('keeps the selected day empty instead of showing historical predictions', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(payload(['2026-07-19', '2026-07-20'], []));

    await expect(loadInsightsContent('2026-07-21', fetcher)).resolves.toEqual({
      availableDates: ['2026-07-19', '2026-07-20'],
      resolvedDate: '2026-07-21',
      reports: [],
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('2026-07-21');
  });

  test('returns an empty state without issuing a second request', async () => {
    const fetcher = jest.fn().mockResolvedValue(payload([], []));

    await expect(loadInsightsContent('2026-07-21', fetcher)).resolves.toEqual({
      availableDates: [],
      resolvedDate: '2026-07-21',
      reports: [],
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test('does not accept a report for the wrong date', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(payload(['2026-07-21'], [report('2026-07-20')]));

    await expect(loadInsightsContent('2026-07-21', fetcher)).resolves.toEqual({
      availableDates: ['2026-07-21'],
      resolvedDate: '2026-07-21',
      reports: [],
    });
  });
});
