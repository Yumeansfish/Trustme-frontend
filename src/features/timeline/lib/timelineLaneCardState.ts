import moment from 'moment';

import { seconds_to_duration } from '~/app/lib/time';
import type { TimelineSegment } from '~/shared/contracts/activity.generated';

const TOOLTIP_OFFSET = 16;
const TOOLTIP_FALLBACK_WIDTH = 240;
const TOOLTIP_FALLBACK_HEIGHT = 176;
const TICK_INTERVAL_MINUTES = 5;

export interface TimelineTickMark {
  key: string;
  label: string;
  leftPct: number;
  timeMs: number;
  edge?: 'start' | 'end';
  showLabel?: boolean;
}

export interface TimelineDecoratedSegment extends TimelineSegment {
  leftPct: number;
  widthPct: number;
  dateLabel: string;
  durationLabel: string;
  rangeLabel: string;
  fields: Array<{ label: string; value: string; wide?: boolean }>;
  showLabel: boolean;
}

export function buildTimelineTooltipPosition({
  clientX,
  clientY,
  tooltipWidth = TOOLTIP_FALLBACK_WIDTH,
  tooltipHeight = TOOLTIP_FALLBACK_HEIGHT,
  viewportWidth,
  viewportHeight,
}: {
  clientX: number;
  clientY: number;
  tooltipWidth?: number;
  tooltipHeight?: number;
  viewportWidth: number;
  viewportHeight: number;
}) {
  const maxX = Math.max(8, viewportWidth - tooltipWidth - 8);
  const maxY = Math.max(8, viewportHeight - tooltipHeight - 8);
  return {
    tooltipX: Math.min(clientX + TOOLTIP_OFFSET, maxX),
    tooltipY: Math.min(clientY + TOOLTIP_OFFSET, maxY),
  };
}

function buildTimelineFields(segment: TimelineSegment, laneType: string) {
  if (laneType === 'status') {
    return [
      { label: 'State', value: segment.label },
      { label: 'Source', value: segment.source },
    ];
  }

  const fields: Array<{ label: string; value: string; wide?: boolean }> = [
    { label: 'App', value: segment.label },
  ];
  if (segment.category) {
    fields.push({ label: 'Category', value: segment.category });
  }
  fields.push({ label: 'Source', value: segment.source });
  if (segment.detail && segment.detail !== segment.label) {
    fields.push({ label: 'Detail', value: segment.detail, wide: true });
  }
  return fields;
}

export function decorateTimelineSegments(
  segments: TimelineSegment[],
  {
    laneType,
    rangeStartMs,
    rangeEndMs,
  }: {
    laneType: string;
    rangeStartMs: number | null;
    rangeEndMs: number | null;
  }
): TimelineDecoratedSegment[] {
  if (rangeStartMs == null || rangeEndMs == null || rangeEndMs <= rangeStartMs) {
    return [];
  }
  const rangeDurationMs = rangeEndMs - rangeStartMs;
  return segments.flatMap(segment => {
    const startMs = Math.max(moment(segment.start).valueOf(), rangeStartMs);
    const endMs = Math.min(moment(segment.end).valueOf(), rangeEndMs);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return [];
    }
    const leftPct = ((startMs - rangeStartMs) / rangeDurationMs) * 100;
    const widthPct = ((endMs - startMs) / rangeDurationMs) * 100;
    return [
      {
        ...segment,
        leftPct,
        widthPct,
        dateLabel: moment(startMs).format('ddd D MMM'),
        durationLabel: seconds_to_duration((endMs - startMs) / 1000),
        rangeLabel: `${moment(startMs).format('HH:mm:ss')} - ${moment(endMs).format('HH:mm:ss')}`,
        fields: buildTimelineFields(segment, laneType),
        showLabel: widthPct >= (laneType === 'status' ? 5 : 7),
      },
    ];
  });
}

export function buildTimelineLaneTickMarks({
  rangeStartMs,
  rangeEndMs,
  rangeDurationMs,
}: {
  rangeStartMs: number | null;
  rangeEndMs: number | null;
  rangeDurationMs: number;
}): TimelineTickMark[] {
  if (rangeStartMs == null || rangeEndMs == null || !rangeDurationMs) return [];

  const ticks: TimelineTickMark[] = [
    {
      key: 'start',
      label: moment(rangeStartMs).format('HH:mm'),
      leftPct: 0,
      timeMs: rangeStartMs,
      edge: 'start',
      showLabel: true,
    },
  ];
  const internalTicks: TimelineTickMark[] = [];
  const cursor = moment(rangeStartMs).startOf('minute');
  const minuteRemainder = cursor.minute() % TICK_INTERVAL_MINUTES;
  if (minuteRemainder !== 0) cursor.add(TICK_INTERVAL_MINUTES - minuteRemainder, 'minutes');
  if (cursor.valueOf() <= rangeStartMs) cursor.add(TICK_INTERVAL_MINUTES, 'minutes');
  if ((cursor.valueOf() - rangeStartMs) / 60_000 < TICK_INTERVAL_MINUTES / 2) {
    cursor.add(TICK_INTERVAL_MINUTES, 'minutes');
  }
  while (cursor.valueOf() < rangeEndMs) {
    internalTicks.push({
      key: cursor.toISOString(),
      label: cursor.format('HH:mm'),
      leftPct: ((cursor.valueOf() - rangeStartMs) / rangeDurationMs) * 100,
      timeMs: cursor.valueOf(),
    });
    cursor.add(TICK_INTERVAL_MINUTES, 'minutes');
  }
  const labelStep = Math.max(1, Math.ceil(internalTicks.length / 4));
  internalTicks.forEach((tick, index) => ticks.push({ ...tick, showLabel: index % labelStep === 0 }));
  ticks.push({
    key: 'end',
    label: moment(rangeEndMs).format('HH:mm'),
    leftPct: 100,
    timeMs: rangeEndMs,
    edge: 'end',
    showLabel: true,
  });

  const minEdgeGapMs = (TICK_INTERVAL_MINUTES / 2) * 60_000;
  for (let index = 1; index < ticks.length - 1; index += 1) {
    const tick = ticks[index];
    if (tick.showLabel === false) continue;
    const previous = ticks.slice(0, index).reverse().find(candidate => candidate.showLabel !== false);
    const next = ticks.slice(index + 1).find(candidate => candidate.showLabel !== false);
    if (
      (previous && tick.timeMs - previous.timeMs < minEdgeGapMs) ||
      (next && next.timeMs - tick.timeMs < minEdgeGapMs)
    ) {
      tick.showLabel = false;
    }
  }
  return ticks;
}

export function buildTimelineLaneSegmentStyle(segment: {
  widthPct: number;
  clipped_start: boolean;
  clipped_end: boolean;
  leftPct: number;
}) {
  let baseInsetPx = 3;
  if (segment.widthPct > 6) baseInsetPx = 6;
  else if (segment.widthPct > 2.5) baseInsetPx = 5;
  else if (segment.widthPct > 1) baseInsetPx = 4;
  const leftInsetPx = segment.clipped_start ? 0 : baseInsetPx;
  const rightInsetPx = segment.clipped_end ? 0 : baseInsetPx;
  return {
    left: `calc(${segment.leftPct}% + ${leftInsetPx}px)`,
    width: `max(0.24rem, calc(${Math.max(segment.widthPct, 0.5)}% - ${leftInsetPx + rightInsetPx}px))`,
  };
}
