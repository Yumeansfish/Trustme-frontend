const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type DateAvailability = readonly string[] | null | undefined;

/**
 * `undefined` means that a view does not use availability filtering.
 * `null` means that availability has not loaded yet.
 * An array (including an empty one) is an authoritative set of selectable dates.
 */
export function isDateAvailable(value: string, availableDates: DateAvailability): boolean {
  if (availableDates === undefined) return true;
  if (availableDates === null) return false;
  return availableDates.includes(value);
}

export function normalizeAvailableDates(availableDates: DateAvailability): string[] {
  if (!Array.isArray(availableDates)) return [];
  return [...new Set(availableDates.filter(value => ISO_DATE_PATTERN.test(value)))].sort();
}

export function resolveLatestAvailableDate(availableDates: DateAvailability): string {
  const normalized = normalizeAvailableDates(availableDates);
  return normalized[normalized.length - 1] || '';
}
