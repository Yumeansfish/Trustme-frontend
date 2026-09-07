import { mergeHomeCalendarDates } from '~/features/home/lib/homeCalendar';

describe('Home calendar dates', () => {
  test('marks the union of check-in and insight dates', () => {
    expect(
      mergeHomeCalendarDates(
        ['2026-08-29', 'invalid'],
        ['2026-08-28', '2026-08-30', '2026-08-29']
      )
    ).toEqual(['2026-08-28', '2026-08-29', '2026-08-30']);
  });
});
