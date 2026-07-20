import type { SummaryPeriodMode as ActivityPeriodMode } from '~/features/summary/lib/summaryTypes';

export function formatTimelineBarHourTick(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes >= 60) {
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${wholeHours}h` : `${wholeHours}h ${minutes}m`;
  }
  return hours === 0 ? '0' : `${totalMinutes}m`;
}

export function isTimelineBarSingleDay(
  timeperiodLength: [number, string],
  _periodMode?: ActivityPeriodMode | null
): boolean {
  const [count, resolution] = timeperiodLength;
  return resolution.startsWith('day') && count === 1;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatCustomDateLabels(start: string | null, count: number, locale: string): string[] {
  const startDate = new Date(start || Date.now());
  const lastDate = addDays(startDate, Math.max(count - 1, 0));
  const shouldIncludeYear = startDate.getFullYear() !== lastDate.getFullYear();
  return Array.from({ length: count }, (_value, day) =>
    addDays(startDate, day).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      ...(shouldIncludeYear ? { year: 'numeric' as const } : {}),
    })
  );
}

function shouldShowCustomAxisLabel(start: string | null, index: number, count: number): boolean {
  if (index === 0 || index === count - 1 || count <= 14) return true;
  if (count <= 31) return index % 3 === 0;
  if (count <= 90) return index % 7 === 0;
  return addDays(new Date(start || Date.now()), index).getDate() === 1;
}

export function buildTimelineBarLabels({
  start,
  timeperiodLength,
  isSingleDay,
  hourOffset,
  periodMode = null,
  locale = 'en-US',
}: {
  start: string | null;
  timeperiodLength: [number, string];
  isSingleDay: boolean;
  hourOffset: number;
  periodMode?: ActivityPeriodMode | null;
  locale?: string;
}): string[] {
  const [count, resolution] = timeperiodLength;
  if (isSingleDay) {
    return Array.from({ length: 24 }, (_value, hour) => {
      const shiftedHour = (hour + hourOffset) % 24;
      return periodMode === 'custom'
        ? `${shiftedHour.toString().padStart(2, '0')}:00`
        : `${shiftedHour}`;
    });
  }
  if (periodMode === 'custom' && resolution.startsWith('day')) {
    return formatCustomDateLabels(start, count, locale);
  }
  if (resolution.startsWith('day')) {
    return Array.from({ length: count }, (_value, day) => `${day + 1}`);
  }
  if (resolution.startsWith('week')) {
    return Array.from({ length: 7 }, (_value, day) => {
      const date = addDays(new Date(start || Date.now()), day);
      const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
      const monthDay = date.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
      return `${weekday} ${monthDay}`;
    });
  }
  if (resolution.startsWith('month')) {
    const date = new Date(start || Date.now());
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const suffixes: Record<string, string> = {
      one: 'st',
      two: 'nd',
      few: 'rd',
      many: 'th',
      zero: 'th',
      other: 'th',
    };
    const pluralRules = new Intl.PluralRules(locale, { type: 'ordinal' });
    return Array.from({ length: daysInMonth }, (_value, day) => {
      const value = day + 1;
      return `${value}${suffixes[pluralRules.select(value)]}`;
    });
  }
  if (resolution === 'year') {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }
  return [];
}

export function buildTimelineBarAxisLabels({
  labels,
  start,
  timeperiodLength,
  periodMode = null,
  isSingleDay,
}: {
  labels: string[];
  start: string | null;
  timeperiodLength: [number, string];
  periodMode?: ActivityPeriodMode | null;
  isSingleDay: boolean;
}): string[] {
  const [count, resolution] = timeperiodLength;
  if (isSingleDay || periodMode !== 'custom' || !resolution.startsWith('day')) return labels;
  return labels.map((label, index) =>
    shouldShowCustomAxisLabel(start, index, count) ? label : ''
  );
}
