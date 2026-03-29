import moment from 'moment';
import _ from 'lodash';

interface ActivityTimeperiodLike {
  start: string;
  length: [number, string];
}

export const ACTIVITY_PERIOD_LABELS: Record<string, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
};

function formatNaturalDateRange(start: moment.Moment, end: moment.Moment): string {
  if (!start.isValid() || !end.isValid()) {
    return '';
  }
  if (start.isSame(end, 'day')) {
    return start.format('MMM D, YYYY');
  }
  return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
}

export function formatActivityDateHeading(
  timeperiod: ActivityTimeperiodLike,
  normalizedPeriodLength: string,
  customEndDate?: string
): string {
  const periodStart = moment(timeperiod.start);
  if (normalizedPeriodLength === 'day') {
    return periodStart.format('dddd, MMMM D, YYYY');
  }
  if (normalizedPeriodLength === 'week') {
    return `Week ${periodStart.format('w')} - ${periodStart.format('MMMM D, YYYY')}`;
  }
  if (normalizedPeriodLength === 'month') {
    return periodStart.format('MMMM YYYY');
  }
  if (normalizedPeriodLength === 'year') {
    return periodStart.format('YYYY');
  }
  if (normalizedPeriodLength === 'custom') {
    const periodEnd = customEndDate
      ? moment(customEndDate, 'YYYY-MM-DD', true)
      : moment(timeperiod.start).add(timeperiod.length[0] - 1, 'days');
    return formatNaturalDateRange(periodStart, periodEnd);
  }
  const [amount, unit] = timeperiod.length as [number, moment.unitOfTime.DurationConstructor];
  return `${periodStart.format('YYYY-MM-DD')} - ${moment(timeperiod.start)
    .add(amount, unit)
    .format('YYYY-MM-DD')}`;
}

export function expandActivityFilterCategories(
  filterCategory: string[] | null,
  allCategories: string[][]
): string[][] | null {
  if (!filterCategory) {
    return null;
  }
  const isChild = (parent: string[]) => (candidate: string[]) =>
    candidate.length > parent.length && _.isEqual(parent, candidate.slice(0, parent.length));
  const children = _.filter(allCategories, isChild(filterCategory));
  return [filterCategory].concat(children);
}
