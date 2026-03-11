import {
  isDateAvailable,
  normalizeAvailableDates,
  resolveLatestAvailableDate,
} from '~/shared/navigation/dateAvailability';

describe('date availability', () => {
  test('distinguishes an unrestricted navigator from loading and empty availability', () => {
    expect(isDateAvailable('2026-07-18', undefined)).toBe(true);
    expect(isDateAvailable('2026-07-18', null)).toBe(false);
    expect(isDateAvailable('2026-07-18', [])).toBe(false);
    expect(isDateAvailable('2026-07-18', ['2026-07-17'])).toBe(false);
    expect(isDateAvailable('2026-07-18', ['2026-07-18'])).toBe(true);
  });

  test('normalizes authoritative dates and resolves the actual latest date', () => {
    const dates = ['2026-07-17', 'invalid', '2026-07-18', '2026-07-17'];

    expect(normalizeAvailableDates(dates)).toEqual(['2026-07-17', '2026-07-18']);
    expect(resolveLatestAvailableDate(dates)).toBe('2026-07-18');
    expect(resolveLatestAvailableDate([])).toBe('');
    expect(resolveLatestAvailableDate(null)).toBe('');
  });
});
