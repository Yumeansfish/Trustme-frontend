import type { ChartDataset } from 'chart.js';

import { normalizeCategory } from '~/features/categorization/lib/categoryEventData';
import type { CategoryPeriodData } from '~/features/summary/lib/summaryTypes';
import type { IEvent } from '~/shared/lib/interfaces';

export type TimelineBarDataset = ChartDataset<'bar', number[]>;

export interface TimelineBarVisibleWindow {
  start: number;
  end: number;
}

export interface TimelineBarBucket {
  periodKey: string;
  catEvents: IEvent[];
  totalHours: number;
  categoryLabels: string[];
}

export interface TimelineBarSelectionOverlay {
  hours: number[];
  ratios: number[];
}

export function ensureTimelineDuration(duration: unknown): number {
  return typeof duration === 'number' && Number.isFinite(duration) ? duration : 0;
}

export function normalizeTimelineHours(seconds: number): number {
  return Math.round((seconds / (60 * 60)) * 1000) / 1000;
}

export function resolveTimelineCategoryLabel(event: IEvent): string {
  return normalizeCategory(event.data?.['$category']).join(' > ');
}

export function buildTimelineBarBuckets(
  byPeriod: CategoryPeriodData | null | undefined
): TimelineBarBucket[] {
  if (!byPeriod) return [];
  return Object.entries(byPeriod)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([periodKey, entry]) => {
      const catEvents = Array.isArray(entry?.cat_events) ? entry.cat_events : [];
      const totalSeconds = catEvents.reduce(
        (sum, event) => sum + ensureTimelineDuration(event.duration),
        0
      );
      const categoryLabels = Array.from(
        new Set(catEvents.map(resolveTimelineCategoryLabel).filter(label => label.length > 0))
      );
      return { periodKey, catEvents, totalHours: normalizeTimelineHours(totalSeconds), categoryLabels };
    });
}

export function resolveTimelineBarVisibleHourWindow({
  buckets,
  labelsLength,
  isSingleDay,
}: {
  buckets: TimelineBarBucket[] | null | undefined;
  labelsLength: number;
  isSingleDay: boolean;
}): TimelineBarVisibleWindow {
  if (!isSingleDay || !buckets || labelsLength === 0) {
    return { start: 0, end: Math.max(labelsLength - 1, 0) };
  }
  const activeIndexes = Array.from({ length: labelsLength }, (_value, index) => index).filter(
    index => (buckets[index]?.totalHours ?? 0) > 0
  );
  if (activeIndexes.length === 0) return { start: 0, end: Math.max(labelsLength - 1, 0) };
  return {
    start: Math.max(0, activeIndexes[0] - 2),
    end: Math.min(labelsLength - 1, activeIndexes[activeIndexes.length - 1] + 2),
  };
}

export function buildTimelineBarVisibleBuckets({
  buckets,
  visibleHourWindow,
}: {
  buckets: TimelineBarBucket[] | null | undefined;
  visibleHourWindow: TimelineBarVisibleWindow;
}): TimelineBarBucket[] {
  if (!buckets) return [];
  return buckets.slice(visibleHourWindow.start, visibleHourWindow.end + 1);
}

export function buildTimelineBarVisibleDataset({
  buckets,
  normalColor,
  hoverColor,
}: {
  buckets: TimelineBarBucket[];
  normalColor: string;
  hoverColor: string;
}): TimelineBarDataset[] {
  return [
    {
      label: 'Timeline',
      data: buckets.map(bucket => bucket.totalHours),
      backgroundColor: buckets.map(() => normalColor),
      hoverBackgroundColor: buckets.map(() => hoverColor),
      borderColor: buckets.map(() => normalColor),
      hoverBorderColor: buckets.map(() => hoverColor),
      borderWidth: 0,
      borderRadius: 0,
      borderSkipped: false,
      inflateAmount: 1,
    },
  ];
}

export function buildTimelineBarChartData({
  labels,
  datasets,
}: {
  labels: string[];
  datasets: TimelineBarDataset[] | null | undefined;
}) {
  return { labels, datasets: datasets || [], title: { display: true, text: 'Timeline' } };
}

export function buildTimelineBarSelectionOverlay({
  buckets,
  selectedCategoryLabel,
}: {
  buckets: TimelineBarBucket[];
  selectedCategoryLabel: string | null;
}): TimelineBarSelectionOverlay {
  if (!selectedCategoryLabel) {
    return { hours: buckets.map(() => 0), ratios: buckets.map(() => 0) };
  }
  const hours = buckets.map(bucket =>
    normalizeTimelineHours(
      bucket.catEvents.reduce(
        (sum, event) =>
          resolveTimelineCategoryLabel(event) === selectedCategoryLabel
            ? sum + ensureTimelineDuration(event.duration)
            : sum,
        0
      )
    )
  );
  return {
    hours,
    ratios: hours.map((selectedHours, index) => {
      const totalHours = buckets[index]?.totalHours ?? 0;
      return totalHours > 0 && selectedHours > 0
        ? Math.max(0, Math.min(1, selectedHours / totalHours))
        : 0;
    }),
  };
}
