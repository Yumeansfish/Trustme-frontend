import moment from 'moment';
import { get_day_start, get_today } from '~/app/lib/time';

const VALID_PERIOD_LENGTHS = ['day', 'week', 'month', 'year', 'custom'];

export interface ActivityTimeperiod {
  start: string;
  length: [number, string];
}

function isValidPeriodLength(value: unknown): value is string {
  return typeof value === 'string' && VALID_PERIOD_LENGTHS.includes(value);
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && moment(value, 'YYYY-MM-DD', true).isValid();
}

export function normalizeDateForPeriod(
  date: string,
  periodLength: string,
  startOfWeek: string
): string {
  const parsed = moment(date);
  if (!parsed.isValid()) {
    return date;
  }

  if (!['day', 'week', 'month', 'year'].includes(periodLength)) {
    return parsed.format('YYYY-MM-DD');
  }

  if (periodLength === 'day') {
    return parsed.startOf('day').format('YYYY-MM-DD');
  }

  if (periodLength === 'week') {
    const unit = startOfWeek === 'Monday' ? 'isoWeek' : 'week';
    return parsed.startOf(unit).format('YYYY-MM-DD');
  }

  return parsed.startOf(periodLength as 'month' | 'year').format('YYYY-MM-DD');
}

export function resolveNormalizedPeriodLength(periodLength: unknown, date: unknown): string {
  if (isValidPeriodLength(periodLength)) {
    return periodLength;
  }

  if (isValidPeriodLength(date)) {
    return date;
  }

  return 'day';
}

export function resolveNormalizedDate(
  date: unknown,
  periodLength: unknown
): string {
  if (isValidDateString(date)) {
    return date;
  }

  if (isValidDateString(periodLength)) {
    return periodLength;
  }

  return get_today();
}

export function normalizeCustomDateRange(
  startDate: string,
  endDate?: string | null
): { start: string; end: string } {
  const start = moment(startDate, 'YYYY-MM-DD', true);
  const end = moment(endDate || startDate, 'YYYY-MM-DD', true);

  if (!start.isValid() && !end.isValid()) {
    const today = get_today();
    return { start: today, end: today };
  }

  if (!start.isValid()) {
    const normalized = end.format('YYYY-MM-DD');
    return { start: normalized, end: normalized };
  }

  if (!end.isValid()) {
    const normalized = start.format('YYYY-MM-DD');
    return { start: normalized, end: normalized };
  }

  const ordered = [start, end].sort((left, right) => left.valueOf() - right.valueOf());
  return {
    start: ordered[0].format('YYYY-MM-DD'),
    end: ordered[1].format('YYYY-MM-DD'),
  };
}

export function resolveActivityTimeperiod(
  date: string,
  normalizedPeriodLength: string,
  periodIsBrowseable: boolean,
  endDate?: string
): ActivityTimeperiod {
  if (normalizedPeriodLength === 'custom') {
    const normalizedRange = normalizeCustomDateRange(date, endDate);
    const spanDays =
      moment(normalizedRange.end, 'YYYY-MM-DD', true).diff(
        moment(normalizedRange.start, 'YYYY-MM-DD', true),
        'days'
      ) + 1;
    return {
      start: get_day_start(normalizedRange.start),
      length: [Math.max(1, spanDays), 'days'],
    };
  }

  if (periodIsBrowseable) {
    return {
      start: get_day_start(date),
      length: [1, normalizedPeriodLength || 'day'],
    };
  }

  return {
    start: get_day_start(date),
    length: [1, 'day'],
  };
}

export function shiftPeriodDate(
  date: string,
  timeperiod: ActivityTimeperiod,
  direction: 'previous' | 'next'
): string {
  const cursor = moment(date);
  const [spanLength, unit] = timeperiod.length as [number, moment.unitOfTime.DurationConstructor];
  return (
    direction === 'previous' ? cursor.subtract(spanLength, unit) : cursor.add(spanLength, unit)
  ).format('YYYY-MM-DD');
}

function resolveAvailablePeriodStart(
  date: string,
  periodLength: string,
  startOfWeek: string
): string {
  if (!date) {
    return '';
  }

  return normalizeDateForPeriod(date, periodLength, startOfWeek);
}

function resolveAvailablePeriodEnd(
  date: string,
  periodLength: string,
  startOfWeek: string
): string {
  if (!date) {
    return '';
  }

  const start = moment(resolveAvailablePeriodStart(date, periodLength, startOfWeek), 'YYYY-MM-DD', true);
  if (!start.isValid()) {
    return '';
  }

  if (periodLength === 'week') {
    return start.add(1, 'week').format('YYYY-MM-DD');
  }

  if (periodLength === 'month') {
    return start.add(1, 'month').format('YYYY-MM-DD');
  }

  if (periodLength === 'year') {
    return start.add(1, 'year').format('YYYY-MM-DD');
  }

  return start.add(1, 'day').format('YYYY-MM-DD');
}

export function canNavigateActivityPeriod({
  targetDate,
  periodLength,
  startOfWeek,
  earliestAvailableDate,
  latestAvailableDate,
  availableDates,
}: {
  targetDate: string;
  periodLength: string;
  startOfWeek: string;
  earliestAvailableDate?: string;
  latestAvailableDate?: string;
  availableDates?: string[] | null;
}): boolean {
  if (!targetDate) {
    return false;
  }

  const hasLowerBound = typeof earliestAvailableDate === 'string' && earliestAvailableDate.length > 0;
  const hasUpperBound = typeof latestAvailableDate === 'string' && latestAvailableDate.length > 0;
  if (!hasLowerBound && !hasUpperBound) {
    return false;
  }

  if (hasLowerBound) {
    const earliestPeriodDate = resolveAvailablePeriodStart(
      earliestAvailableDate!,
      periodLength,
      startOfWeek
    );
    if (earliestPeriodDate && targetDate < earliestPeriodDate) {
      return false;
    }
  }

  if (hasUpperBound && targetDate > latestAvailableDate!) {
    return false;
  }

  if (Array.isArray(availableDates) && availableDates.length > 0) {
    const periodStart = resolveAvailablePeriodStart(targetDate, periodLength, startOfWeek);
    const periodEnd = resolveAvailablePeriodEnd(targetDate, periodLength, startOfWeek);
    if (
      !availableDates.some(
        availableDate => availableDate >= periodStart && availableDate < periodEnd
      )
    ) {
      return false;
    }
  }

  return true;
}
