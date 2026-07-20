import moment, { type Moment } from 'moment';

export const CALENDAR_DATE_FORMAT = 'YYYY-MM-DD';

export interface CalendarDay {
  iso: string;
  label: string;
  inMonth: boolean;
  disabled: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
  accessibleLabel: string;
}

export interface CalendarMonthOption {
  key: string;
  iso: string;
  label: string;
  disabled: boolean;
  isSelected: boolean;
  accessibleLabel: string;
}

interface CalendarBounds {
  minDate: Moment | null;
  maxDate: Moment | null;
}

interface BuildCalendarDaysOptions {
  month: Moment;
  firstDayOfWeek?: number;
  includeAdjacentDays?: boolean;
  isDisabled: (date: Moment) => boolean;
  selectedDates?: string[];
  rangeStart?: Moment | null;
  rangeEnd?: Moment | null;
}

interface KeyboardTargetOptions extends CalendarBounds {
  value: string;
  key: string;
  isDisabled: (date: Moment) => boolean;
}

export function parseCalendarDate(value: string): Moment {
  return moment(value, CALENDAR_DATE_FORMAT, true);
}

export function formatCalendarDate(value: string, fallback = ''): string {
  const parsed = parseCalendarDate(value);
  return parsed.isValid() ? parsed.format('MMM D, YYYY') : fallback;
}

export function calendarWeekdays(): string[] {
  const firstDayOfWeek = moment.localeData().firstDayOfWeek();
  const weekdays = moment.weekdaysMin();
  return weekdays.slice(firstDayOfWeek).concat(weekdays.slice(0, firstDayOfWeek));
}

export function isCalendarMonthOutsideBounds(month: Moment, bounds: CalendarBounds): boolean {
  const monthStart = month.clone().startOf('month');
  const monthEnd = month.clone().endOf('month');
  if (bounds.minDate && monthEnd.isBefore(bounds.minDate, 'day')) return true;
  return Boolean(bounds.maxDate && monthStart.isAfter(bounds.maxDate, 'day'));
}

export function buildCalendarDays({
  month,
  firstDayOfWeek = moment.localeData().firstDayOfWeek(),
  includeAdjacentDays = true,
  isDisabled,
  selectedDates = [],
  rangeStart = null,
  rangeEnd = null,
}: BuildCalendarDaysOptions): CalendarDay[] {
  const monthStart = month.clone().startOf('month');
  const offset = (monthStart.day() - firstDayOfWeek + 7) % 7;
  const gridStart = includeAdjacentDays ? monthStart.clone().subtract(offset, 'days') : monthStart;
  const dayCount = includeAdjacentDays ? 42 : month.daysInMonth();
  const today = moment().startOf('day');
  const hasRange = Boolean(
    rangeStart?.isValid() && rangeEnd?.isValid() && !rangeEnd.isBefore(rangeStart, 'day')
  );

  return Array.from({ length: dayCount }, (_, index) => {
    const date = gridStart.clone().add(index, 'days');
    const iso = date.format(CALENDAR_DATE_FORMAT);
    return {
      iso,
      label: date.format('D'),
      inMonth: date.isSame(month, 'month'),
      disabled: isDisabled(date),
      isToday: date.isSame(today, 'day'),
      isSelected: selectedDates.includes(iso),
      isInRange: Boolean(
        hasRange && date.isAfter(rangeStart as Moment, 'day') && date.isBefore(rangeEnd as Moment, 'day')
      ),
      accessibleLabel: date.format('dddd, MMMM D, YYYY'),
    };
  });
}

export function buildCalendarMonthOptions({
  year,
  role,
  selectedMonth,
  bounds,
}: {
  year: Moment;
  role: string;
  selectedMonth: Moment;
  bounds: CalendarBounds;
}): CalendarMonthOption[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = year.clone().month(index).startOf('month');
    return {
      key: `${role}-${month.format('YYYY-MM')}`,
      iso: month.format(CALENDAR_DATE_FORMAT),
      label: month.format('MMM'),
      disabled: isCalendarMonthOutsideBounds(month, bounds),
      isSelected: month.isSame(selectedMonth, 'month'),
      accessibleLabel: month.format('MMMM YYYY'),
    };
  });
}

export function findCalendarKeyboardTarget({
  value,
  key,
  minDate,
  maxDate,
  isDisabled,
}: KeyboardTargetOptions): string {
  const current = parseCalendarDate(value);
  if (!current.isValid()) return '';

  const offsets: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };
  if (key === 'Home') return current.clone().startOf('week').format(CALENDAR_DATE_FORMAT);
  if (key === 'End') return current.clone().endOf('week').format(CALENDAR_DATE_FORMAT);
  const offset = offsets[key];
  if (!offset) return '';

  let target = current.clone();
  for (let attempt = 0; attempt < 370; attempt += 1) {
    target = target.add(offset, 'days');
    if (minDate && target.isBefore(minDate, 'day')) return '';
    if (maxDate && target.isAfter(maxDate, 'day')) return '';
    if (!isDisabled(target)) return target.format(CALENDAR_DATE_FORMAT);
  }
  return '';
}
