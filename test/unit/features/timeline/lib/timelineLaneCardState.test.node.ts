import {
  buildTimelineLaneSegmentStyle,
  buildTimelineLaneTickMarks,
  buildTimelineTooltipPosition,
  decorateTimelineSegments,
} from '~/features/timeline/lib/timelineLaneCardState';

describe('timelineLaneCardState', () => {
  test('decorates backend segments without recomposing overlaps', () => {
    const segments = decorateTimelineSegments(
      [
        {
          key: 'code:1',
          label: 'Code',
          detail: 'Editor.ts',
          category: 'Coding',
          source: 'Window',
          start: '2026-03-21T10:00:00.000Z',
          end: '2026-03-21T10:02:00.000Z',
          clipped_start: false,
          clipped_end: false,
          variant: 'primary',
        },
      ],
      {
        laneType: 'activity',
        rangeStartMs: new Date('2026-03-21T10:00:00.000Z').getTime(),
        rangeEndMs: new Date('2026-03-21T10:10:00.000Z').getTime(),
      }
    );

    expect(segments).toHaveLength(1);
    expect(segments[0].leftPct).toBe(0);
    expect(segments[0].widthPct).toBe(20);
    expect(segments[0].fields).toEqual([
      { label: 'App', value: 'Code' },
      { label: 'Category', value: 'Coding' },
      { label: 'Source', value: 'Window' },
      { label: 'Detail', value: 'Editor.ts', wide: true },
    ]);
  });

  test('buildTimelineLaneTickMarks returns anchored start/end ticks', () => {
    const ticks = buildTimelineLaneTickMarks({
      rangeStartMs: new Date('2026-03-21T10:00:00.000Z').getTime(),
      rangeEndMs: new Date('2026-03-21T10:30:00.000Z').getTime(),
      rangeDurationMs: 30 * 60 * 1000,
    });
    expect(ticks[0]).toMatchObject({ key: 'start', leftPct: 0, showLabel: true });
    expect(ticks[ticks.length - 1]).toMatchObject({ key: 'end', leftPct: 100, showLabel: true });
  });

  test('buildTimelineLaneSegmentStyle preserves exact time geometry for narrow segments', () => {
    expect(
      buildTimelineLaneSegmentStyle({
        leftPct: 10,
        widthPct: 0.2,
      })
    ).toEqual({
      left: '10%',
      width: '0.2%',
    });
  });

  test('adjacent segment styles meet at their real boundary without an artificial gap', () => {
    const first = buildTimelineLaneSegmentStyle({ leftPct: 0, widthPct: 37.5 });
    const second = buildTimelineLaneSegmentStyle({ leftPct: 37.5, widthPct: 62.5 });

    expect(first).toEqual({ left: '0%', width: '37.5%' });
    expect(second).toEqual({ left: '37.5%', width: '62.5%' });
  });

  test('decorateTimelineSegments clips geometry exactly to both range edges', () => {
    const segments = decorateTimelineSegments(
      [
        {
          key: 'wide:1',
          label: 'Code',
          detail: 'Editor.ts',
          category: 'Coding',
          source: 'Window',
          start: '2026-03-21T09:55:00.000Z',
          end: '2026-03-21T10:15:00.000Z',
          clipped_start: true,
          clipped_end: true,
          variant: 'primary',
        },
      ],
      {
        laneType: 'activity',
        rangeStartMs: new Date('2026-03-21T10:00:00.000Z').getTime(),
        rangeEndMs: new Date('2026-03-21T10:10:00.000Z').getTime(),
      }
    );

    expect(segments[0]).toMatchObject({ leftPct: 0, widthPct: 100 });
    expect(buildTimelineLaneSegmentStyle(segments[0])).toEqual({
      left: '0%',
      width: '100%',
    });
  });

  test('buildTimelineTooltipPosition clamps the tooltip within the viewport', () => {
    expect(
      buildTimelineTooltipPosition({
        clientX: 980,
        clientY: 760,
        tooltipWidth: 240,
        tooltipHeight: 176,
        viewportWidth: 1000,
        viewportHeight: 800,
      })
    ).toEqual({ tooltipX: 752, tooltipY: 616 });
  });
});
