import moment, { type Moment } from 'moment';

export function seconds_to_duration(seconds: number) {
  // Returns a human-readable duration string
  const hrs = Math.floor(seconds / 60 / 60);
  const min = Math.floor((seconds / 60) % 60);
  const sec = Math.floor(seconds % 60);
  const l = [];

  if (hrs > 0) {
    l.push(hrs + 'h');
    l.push(min + 'm');
  } else if (min > 0) {
    l.push(min + 'm');
  }
  l.push(sec + 's');

  return l.join(' ');
}

export function get_day_start(dateParam: Moment | string) {
  const dateMoment = dateParam ? moment(dateParam) : moment().startOf('day');
  return dateMoment.startOf('day').format();
}

export function get_today(): string {
  return moment().startOf('day').format('YYYY-MM-DD');
}
