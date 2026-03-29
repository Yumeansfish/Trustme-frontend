import moment from 'moment';

const DEFAULT_FIXED_RANGE_SECONDS = 60;
const LOOKBACK_MINUTES = 30;

export function parseTimelineFixedRange(
  query: Record<string, unknown>
): [moment.Moment, moment.Moment] | null {
  const startQuery = typeof query.start === 'string' ? query.start : '';
  const endQuery = typeof query.end === 'string' ? query.end : '';
  const timestampQuery = typeof query.ts === 'string' ? query.ts : '';
  const rawMinutes = String(query.minutes || '');
  const secondsQuery = Number(query.seconds || query.minutes || 0);

  if (startQuery && endQuery) {
    const start = moment(startQuery);
    const end = moment(endQuery);

    if (start.isValid() && end.isValid() && end.isAfter(start)) {
      return [start, end];
    }
  }

  if (!timestampQuery) {
    return null;
  }

  const center = moment(timestampQuery);
  if (!center.isValid()) {
    return null;
  }

  const usesMinutes = rawMinutes.length > 0;
  const baseSeconds = Number.isFinite(secondsQuery) && secondsQuery > 0
    ? secondsQuery
    : DEFAULT_FIXED_RANGE_SECONDS;
  const spanSeconds = Math.max(usesMinutes ? baseSeconds * 60 : baseSeconds, 1);

  return [
    center.clone().subtract(spanSeconds / 2, 'seconds'),
    center.clone().add(spanSeconds / 2, 'seconds'),
  ];
}

export function buildTimelineRange(
  query: Record<string, unknown>,
  now = moment()
): [moment.Moment, moment.Moment] {
  const fixedRange = parseTimelineFixedRange(query);
  if (fixedRange) {
    return fixedRange;
  }

  const end = now.clone();
  const start = end.clone().subtract(LOOKBACK_MINUTES, 'minutes');
  return [start, end];
}
