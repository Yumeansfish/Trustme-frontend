import moment from 'moment';
import { get_day_start } from '~/app/lib/time';

export interface TimePeriod {
  start: string;
  length: [number, string];
}

export function dateToTimeperiod(
  date: string,
  duration?: [number, string]
): TimePeriod {
  return { start: get_day_start(date), length: duration || [1, 'day'] };
}

export function timeperiodToStr(tp: TimePeriod): string {
  const start = moment(tp.start).format();
  const end = moment(start)
    .add(tp.length[0], tp.length[1] as moment.unitOfTime.DurationConstructor)
    .format();
  return [start, end].join('/');
}

export function timeperiodsHoursOfPeriod(timeperiod: TimePeriod): TimePeriod[] {
  const periods = [];
  const _length: [number, string] = [1, 'hour'];
  for (let i = 0; i < 24; i++) {
    const start = moment(timeperiod.start)
      .add(i * _length[0], _length[1] as moment.unitOfTime.DurationConstructor)
      .format();
    periods.push({ start, length: _length });
  }
  return periods;
}

export function timeperiodsDaysOfPeriod(timeperiod: TimePeriod): TimePeriod[] {
  const periods = [];
  const _length: [number, string] = [1, 'day'];

  let count: number;
  if (timeperiod.length[1].startsWith('day')) {
    count = timeperiod.length[0];
  } else if (timeperiod.length[1].startsWith('week')) {
    count = 7;
  } else if (timeperiod.length[1].startsWith('month')) {
    count = moment(timeperiod.start).daysInMonth();
  } else {
    throw new Error(`Invalid periodLength ${timeperiod.length[1]}`);
  }

  for (let i = 0; i < count; i++) {
    const start = moment(timeperiod.start)
      .add(i * _length[0], _length[1] as moment.unitOfTime.DurationConstructor)
      .format();
    periods.push({ start, length: _length });
  }
  return periods;
}

export function timeperiodsMonthsOfPeriod(timeperiod: TimePeriod): TimePeriod[] {
  const periods = [];
  const _length: [number, string] = [1, 'month'];

  const count = 12;
  for (let i = 0; i < count; i++) {
    const start = moment(timeperiod.start)
      .add(i * _length[0], _length[1] as moment.unitOfTime.DurationConstructor)
      .format();
    periods.push({ start, length: _length });
  }
  return periods;
}
