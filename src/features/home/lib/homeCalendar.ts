import { normalizeAvailableDates } from '~/shared/navigation/dateAvailability';
import type { DailyCheckInDTO } from '~/shared/contracts/daily-checkins.generated';

export function countCalendarCheckIns(checkIns: readonly DailyCheckInDTO[]): Record<string, number> {
  const sessions = new Map<string, Set<string>>();
  for (const record of checkIns) {
    const day = sessions.get(record.checkin_date) ?? new Set<string>();
    day.add(record.session);
    sessions.set(record.checkin_date, day);
  }
  return Object.fromEntries([...sessions].map(([date, day]) => [date, day.size]));
}

/** Dates that should be marked in Home's shared activity/insight calendar. */
export function mergeHomeCalendarDates(
  checkInDates: readonly string[],
  insightDates: readonly string[]
): string[] {
  return normalizeAvailableDates([...checkInDates, ...insightDates]);
}
