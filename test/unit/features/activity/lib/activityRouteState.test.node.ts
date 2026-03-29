import {
  canNavigateActivityPeriod,
  normalizeCustomDateRange,
  normalizeDateForPeriod,
  resolveActivityTimeperiod,
  resolveNormalizedDate,
  resolveNormalizedPeriodLength,
  shiftPeriodDate,
} from '~/features/activity/lib/activityRouteState';

describe('activityRouteState', () => {
  test('normalizes period length and date fallbacks', () => {
    expect(resolveNormalizedPeriodLength('week', '2026-03-20')).toBe('week');
    expect(resolveNormalizedPeriodLength('bogus', 'month')).toBe('month');
    expect(resolveNormalizedPeriodLength('bogus', 'still-bogus')).toBe('day');

    expect(resolveNormalizedDate('2026-03-20', 'week')).toBe('2026-03-20');
    expect(resolveNormalizedDate('bad', '2026-03-18')).toBe('2026-03-18');
  });

  test('normalizes dates for browseable periods', () => {
    expect(normalizeDateForPeriod('2026-03-18', 'day', 'Monday')).toBe('2026-03-18');
    expect(normalizeDateForPeriod('2026-03-18', 'week', 'Monday')).toBe('2026-03-16');
    expect(normalizeDateForPeriod('2026-03-18', 'month', 'Monday')).toBe('2026-03-01');
    expect(normalizeDateForPeriod('2026-03-18', 'year', 'Monday')).toBe('2026-01-01');
  });

  test('builds timeperiods and adjacent dates', () => {
    const browseable = resolveActivityTimeperiod('2026-03-18', 'week', true);
    expect(browseable.start).toBeDefined();
    expect(browseable.length).toEqual([1, 'week']);
    expect(shiftPeriodDate('2026-03-18', browseable, 'previous')).toBe('2026-03-11');
    expect(shiftPeriodDate('2026-03-18', browseable, 'next')).toBe('2026-03-25');

    expect(normalizeCustomDateRange('2026-03-21', '2026-03-18')).toEqual({
      start: '2026-03-18',
      end: '2026-03-21',
    });

    const custom = resolveActivityTimeperiod('2026-03-18', 'custom', false, '2026-03-21');
    expect(custom.start).toContain('2026-03-18');
    expect(custom.length).toEqual([4, 'days']);
  });

  test('derives period-level navigation bounds from available dates', () => {
    expect(
      canNavigateActivityPeriod({
        targetDate: '2025-01-01',
        periodLength: 'year',
        startOfWeek: 'Monday',
        earliestAvailableDate: '2025-05-09',
        latestAvailableDate: '2026-03-18',
        availableDates: ['2025-05-09', '2026-03-18'],
      })
    ).toBe(true);

    expect(
      canNavigateActivityPeriod({
        targetDate: '2024-01-01',
        periodLength: 'year',
        startOfWeek: 'Monday',
        earliestAvailableDate: '2025-05-09',
        latestAvailableDate: '2026-03-18',
        availableDates: ['2025-05-09', '2026-03-18'],
      })
    ).toBe(false);

    expect(
      canNavigateActivityPeriod({
        targetDate: '2025-05-01',
        periodLength: 'month',
        startOfWeek: 'Monday',
        earliestAvailableDate: '2025-05-09',
        latestAvailableDate: '2026-03-18',
        availableDates: ['2025-05-09', '2026-03-18'],
      })
    ).toBe(true);

    expect(
      canNavigateActivityPeriod({
        targetDate: '2026-04-01',
        periodLength: 'month',
        startOfWeek: 'Monday',
        earliestAvailableDate: '2025-05-09',
        latestAvailableDate: '2026-03-18',
        availableDates: ['2025-05-09', '2026-03-18'],
      })
    ).toBe(false);

    expect(
      canNavigateActivityPeriod({
        targetDate: '2025-06-01',
        periodLength: 'month',
        startOfWeek: 'Monday',
        earliestAvailableDate: '2025-05-09',
        latestAvailableDate: '2026-03-18',
        availableDates: ['2025-05-09', '2026-03-18'],
      })
    ).toBe(false);

    expect(
      canNavigateActivityPeriod({
        targetDate: '2026-03-17',
        periodLength: 'day',
        startOfWeek: 'Monday',
        earliestAvailableDate: '',
        latestAvailableDate: '',
      })
    ).toBe(false);
  });
});
