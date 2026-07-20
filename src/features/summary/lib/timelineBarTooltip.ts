import { seconds_to_duration } from '~/app/lib/time';
import { isTimelineBarSingleDay } from '~/features/summary/lib/timelineBarAxis';
import {
  ensureTimelineDuration,
  normalizeTimelineHours,
  resolveTimelineCategoryLabel,
  type TimelineBarBucket,
  type TimelineBarVisibleWindow,
} from '~/features/summary/lib/timelineBarDataset';
import type { SummaryPeriodMode as ActivityPeriodMode } from '~/features/summary/lib/summaryTypes';

export interface TimelineBarTooltipRow {
  label: string;
  value: number;
  percent: number;
  durationLabel: string;
}

export interface TimelineBarTooltipPreview {
  dateLabel: string;
  totalDurationLabel: string;
}

export interface TimelineBarTooltipSummary extends TimelineBarTooltipPreview {
  rows: TimelineBarTooltipRow[];
}

export function resolveTimelineTooltipPosition({
  clientX,
  clientY,
  tooltipWidth,
  tooltipHeight,
  viewportWidth,
  viewportHeight,
}: {
  clientX: number;
  clientY: number;
  tooltipWidth: number;
  tooltipHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}): { x: number; y: number } {
  const edgeInset = 8;
  const offsetX = 22;
  const offsetY = 18;
  const maxX = Math.max(edgeInset, viewportWidth - tooltipWidth - edgeInset);
  const maxY = Math.max(edgeInset, viewportHeight - tooltipHeight - edgeInset);
  const preferredX = clientX + offsetX;
  const x = preferredX > maxX ? clientX - tooltipWidth - offsetX : preferredX;
  return {
    x: Math.max(edgeInset, Math.min(x, maxX)),
    y: Math.max(edgeInset, Math.min(clientY + offsetY, maxY)),
  };
}

interface TimelineTooltipRequest {
  buckets: TimelineBarBucket[];
  start: string | null;
  timeperiodLength: [number, string];
  periodMode?: ActivityPeriodMode | null;
  visibleHourWindow: TimelineBarVisibleWindow;
  dataIndex: number;
}

function formatTooltipDateLabel(
  date: Date,
  periodMode?: ActivityPeriodMode | null,
  isSingleDay?: boolean
): string {
  if (periodMode === 'year' && !isSingleDay) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
  });
}

function resolveTooltipBucketStart({
  start,
  timeperiodLength,
  visibleHourWindow,
  dataIndex,
}: TimelineTooltipRequest): Date {
  const bucketDate = new Date(start || Date.now());
  const effectiveIndex = visibleHourWindow.start + dataIndex;
  const [count, resolution] = timeperiodLength;
  if (resolution.startsWith('day') && count === 1) {
    bucketDate.setHours(bucketDate.getHours() + effectiveIndex, 0, 0, 0);
  } else if (
    resolution.startsWith('day') ||
    resolution.startsWith('week') ||
    resolution.startsWith('month')
  ) {
    bucketDate.setDate(bucketDate.getDate() + effectiveIndex);
  } else if (resolution === 'year') {
    bucketDate.setMonth(bucketDate.getMonth() + effectiveIndex, 1);
  }
  return bucketDate;
}

export function buildTimelineBarTooltipPreview(
  request: TimelineTooltipRequest
): TimelineBarTooltipPreview | null {
  const bucket = request.buckets[request.dataIndex];
  if (!bucket) return null;
  const bucketStart = resolveTooltipBucketStart(request);
  return {
    dateLabel: formatTooltipDateLabel(
      bucketStart,
      request.periodMode,
      isTimelineBarSingleDay(request.timeperiodLength)
    ),
    totalDurationLabel: seconds_to_duration(bucket.totalHours * 60 * 60),
  };
}

export function buildTimelineBarTooltipSummary(
  request: TimelineTooltipRequest
): TimelineBarTooltipSummary {
  const preview = buildTimelineBarTooltipPreview(request) || {
    dateLabel: '',
    totalDurationLabel: '',
  };
  const bucket = request.buckets[request.dataIndex];
  if (!bucket) return { ...preview, rows: [] };
  const rows = bucket.catEvents
    .map(event => ({
      label: resolveTimelineCategoryLabel(event),
      value: normalizeTimelineHours(ensureTimelineDuration(event.duration)),
    }))
    .filter(row => row.label.length > 0 && row.value > 0)
    .sort((left, right) => right.value - left.value);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return {
    ...preview,
    rows: rows.slice(0, 5).map(row => ({
      ...row,
      percent: total > 0 ? Math.max(1, Math.round((row.value / total) * 100)) : 0,
      durationLabel: seconds_to_duration(row.value * 60 * 60),
    })),
  };
}
