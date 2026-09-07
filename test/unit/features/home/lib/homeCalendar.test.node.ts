import { mergeHomeCalendarDates, countCalendarCheckIns } from '~/features/home/lib/homeCalendar';
import type { DailyCheckInDTO } from '~/shared/contracts/daily-checkins.generated';

test('counts morning and afternoon separately without duplicate dots', () => {
  const morning: DailyCheckInDTO = { checkin_date: '2026-09-07', session: 'morning',
    checked_at: '2026-09-07T09:00:00+02:00', inference_due_at: null, session_ends_at: null };
  expect(countCalendarCheckIns([])).toEqual({});
  expect(countCalendarCheckIns([morning])).toEqual({ '2026-09-07': 1 });
  expect(countCalendarCheckIns([morning, morning, { ...morning, session: 'afternoon' }]))
    .toEqual({ '2026-09-07': 2 });
});

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
