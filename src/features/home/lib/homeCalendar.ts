import { normalizeAvailableDates } from '~/shared/navigation/dateAvailability';

/** Dates that should be marked in Home's shared activity/insight calendar. */
export function mergeHomeCalendarDates(
  checkInDates: readonly string[],
  insightDates: readonly string[]
): string[] {
  return normalizeAvailableDates([...checkInDates, ...insightDates]);
}
