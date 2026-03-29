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

  test('buildTimelineLaneSegmentStyle keeps narrow segments visible', () => {
    expect(
      buildTimelineLaneSegmentStyle({
        leftPct: 10,
        widthPct: 0.2,
        clipped_start: false,
        clipped_end: false,
      })
    ).toEqual({
      left: 'calc(10% + 3px)',
      width: 'max(0.24rem, calc(0.5% - 6px))',
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
