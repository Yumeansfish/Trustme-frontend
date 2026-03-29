import moment from 'moment';

import {
  buildTimelineRange,
  parseTimelineFixedRange,
} from '~/features/timeline/lib/timelineViewState';

describe('timelineViewState', () => {
  test('parses an explicit fixed range', () => {
    const range = parseTimelineFixedRange({
      start: '2026-03-21T10:00:00.000Z',
      end: '2026-03-21T10:05:00.000Z',
    });
    expect(range?.[0].toISOString()).toBe('2026-03-21T10:00:00.000Z');
    expect(range?.[1].toISOString()).toBe('2026-03-21T10:05:00.000Z');
  });

  test('uses a 30 minute live range when no fixed range is supplied', () => {
    const now = moment('2026-03-21T10:30:00.000Z');
    const [start, end] = buildTimelineRange({}, now);
    expect(start.toISOString()).toBe('2026-03-21T10:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-21T10:30:00.000Z');
  });
});
