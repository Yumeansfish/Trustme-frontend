import {
  buildCheckInDiagramDomain,
  buildCheckInDiagramSeries,
  formatCheckInDiagramHourTick,
} from '~/features/checkins/lib/checkInDiagramState';
import type { CheckinSession } from '~/shared/contracts/checkins.generated';

describe('checkInDiagramState', () => {
  test('formats hour ticks as HH:mm', () => {
    expect(formatCheckInDiagramHourTick(0)).toBe('00:00');
    expect(formatCheckInDiagramHourTick(9.5)).toBe('09:30');
    expect(formatCheckInDiagramHourTick(24)).toBe('24:00');
  });

  test('builds series from scored answers and includes sleep', () => {
    const sessions: CheckinSession[] = [
      {
        id: 'a',
        date: '2026-03-29',
        started_at: '2026-03-29T09:30:00+02:00',
        ended_at: '2026-03-29T09:31:00+02:00',
        timeline_start: '2026-03-29T09:30:00+02:00',
        timeline_end: '2026-03-29T09:31:00+02:00',
        answers: [
          {
            question_id: 'SLEEP',
            label: 'Sleep',
            status: 'answered',
            value: 5,
            value_label: '5/5',
            progress: 100,
          },
          {
            question_id: '1',
            label: 'Focus',
            status: 'answered',
            value: 4,
            value_label: '4/5',
            progress: 80,
          },
        ],
      },
      {
        id: 'b',
        date: '2026-03-29',
        started_at: '2026-03-29T10:15:00+02:00',
        ended_at: '2026-03-29T10:16:00+02:00',
        timeline_start: '2026-03-29T10:15:00+02:00',
        timeline_end: '2026-03-29T10:16:00+02:00',
        answers: [
          {
            question_id: '1',
            label: 'Focus',
            status: 'answered',
            value: 2,
            value_label: '2/5',
            progress: 40,
          },
          {
            question_id: '2',
            label: 'Energy',
            status: 'answered',
            value: 3,
            value_label: '3/5',
            progress: 60,
          },
        ],
      },
    ];

    expect(buildCheckInDiagramSeries(sessions)).toEqual([
      {
        questionId: 'SLEEP',
        label: 'Sleep',
        data: [{ x: 9.5, y: 5 }],
      },
      {
        questionId: '1',
        label: 'Focus',
        data: [
          { x: 9.5, y: 4 },
          { x: 10.25, y: 2 },
        ],
      },
      {
        questionId: '2',
        label: 'Energy',
        data: [{ x: 10.25, y: 3 }],
      },
    ]);
  });

  test('builds a bounded time domain from session start and end', () => {
    const sessions: CheckinSession[] = [
      {
        id: 'a',
        date: '2026-03-29',
        started_at: '2026-03-29T09:30:00+02:00',
        ended_at: '2026-03-29T09:31:00+02:00',
        timeline_start: '2026-03-29T09:30:00+02:00',
        timeline_end: '2026-03-29T09:31:00+02:00',
        answers: [],
      },
      {
        id: 'b',
        date: '2026-03-29',
        started_at: '2026-03-29T13:15:00+02:00',
        ended_at: '2026-03-29T13:16:00+02:00',
        timeline_start: '2026-03-29T13:15:00+02:00',
        timeline_end: '2026-03-29T13:16:00+02:00',
        answers: [],
      },
    ];

    expect(buildCheckInDiagramDomain(sessions)).toEqual({
      minX: 9.25,
      maxX: 13.516666666666667,
    });
  });
});
