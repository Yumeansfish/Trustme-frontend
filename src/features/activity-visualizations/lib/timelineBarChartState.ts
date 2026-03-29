import { seconds_to_duration } from '~/app/lib/time';
import type { IEvent } from '~/shared/lib/interfaces';
import { normalizeCategory } from '~/features/activity-dashboard/store/activityCategoryData';
import type { ActivityPeriodMode, CategoryPeriodData } from '~/features/activity-dashboard/store/activityTypes';

export interface TimelineBarDataset {
  label?: string;
  data?: Array<number | null>;
  [key: string]: any;
}

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

function ensureDuration(duration: unknown): number {
  return typeof duration === 'number' && Number.isFinite(duration) ? duration : 0;
}

function normalizeHours(seconds: number): number {
  return Math.round((seconds / (60 * 60)) * 1000) / 1000;
}

function resolveCategoryLabel(event: IEvent): string {
  return normalizeCategory(event.data?.['$category']).join(' > ');
}

export function formatTimelineBarHourTick(hours: number): string {
  const totalMinutes = Math.round(hours * 60);

  if (totalMinutes >= 60) {
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
      return `${wholeHours}h`;
    }

    return `${wholeHours}h ${minutes}m`;
  }

  if (hours === 0) return '0';
  return `${totalMinutes}m`;
}

export function isTimelineBarSingleDay(
  timeperiodLength: [number, string],
  _periodMode?: ActivityPeriodMode | null
) {
  const [count, resolution] = timeperiodLength;
  return resolution.startsWith('day') && count === 1;
}

function formatTimelineBarCustomHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatTimelineBarCustomDateLabels({
  start,
  count,
  locale,
}: {
  start: string | null;
  count: number;
  locale: string;
}): string[] {
  const startDate = new Date(start || Date.now());
  const lastDate = addDays(startDate, Math.max(count - 1, 0));
  const shouldIncludeYear = startDate.getFullYear() !== lastDate.getFullYear();

  return Array.from({ length: count }, (_value, day) => {
    const date = addDays(startDate, day);
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      ...(shouldIncludeYear ? { year: 'numeric' as const } : {}),
    });
  });
}

function shouldShowTimelineBarCustomAxisLabel({
  start,
  index,
  count,
}: {
  start: string | null;
  index: number;
  count: number;
}): boolean {
  if (index === 0 || index === count - 1) {
    return true;
  }

  if (count <= 14) {
    return true;
  }

  if (count <= 31) {
    return index % 3 === 0;
  }

  if (count <= 90) {
    return index % 7 === 0;
  }

  const date = addDays(new Date(start || Date.now()), index);
  return date.getDate() === 1;
}

export function buildTimelineBarLabels({
  start,
  timeperiodLength,
  isSingleDay,
  hourOffset,
  periodMode = null,
  locale = 'en-US',
}: {
  start: string | null;
  timeperiodLength: [number, string];
  isSingleDay: boolean;
  hourOffset: number;
  periodMode?: ActivityPeriodMode | null;
  locale?: string;
}) {
  const [count, resolution] = timeperiodLength;

  if (isSingleDay) {
    return Array.from({ length: 24 }, (_value, hour) => {
      const shiftedHour = (hour + hourOffset) % 24;
      return periodMode === 'custom'
        ? formatTimelineBarCustomHourLabel(shiftedHour)
        : `${shiftedHour}`;
    });
  }

  if (periodMode === 'custom' && resolution.startsWith('day')) {
    return formatTimelineBarCustomDateLabels({ start, count, locale });
  }

  if (resolution.startsWith('day')) {
    return Array.from({ length: count }, (_value, day) => `${day + 1}`);
  }

  if (resolution.startsWith('week')) {
    return Array.from({ length: 7 }, (_value, day) => {
      const date = new Date(start || Date.now());
      date.setDate(date.getDate() + day);
      const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
      const monthDay = date.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
      return `${weekday} ${monthDay}`;
    });
  }

  if (resolution.startsWith('month')) {
    const date = new Date(start || Date.now());
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const ordinalSuffixes = {
      one: 'st',
      two: 'nd',
      few: 'rd',
      many: 'th',
      zero: 'th',
      other: 'th',
    } as Record<string, string>;

    const toOrdinalSuffix = (value: number) => {
      const pluralRules = new Intl.PluralRules(locale, { type: 'ordinal' });
      return `${value}${ordinalSuffixes[pluralRules.select(value)]}`;
    };

    return Array.from({ length: daysInMonth }, (_value, day) => toOrdinalSuffix(day + 1));
  }

  if (resolution === 'year') {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  return [];
}

export function buildTimelineBarAxisLabels({
  labels,
  start,
  timeperiodLength,
  periodMode = null,
  isSingleDay,
}: {
  labels: string[];
  start: string | null;
  timeperiodLength: [number, string];
  periodMode?: ActivityPeriodMode | null;
  isSingleDay: boolean;
}) {
  const [count, resolution] = timeperiodLength;

  if (isSingleDay || periodMode !== 'custom' || !resolution.startsWith('day')) {
    return labels;
  }

  return labels.map((label, index) => {
    return shouldShowTimelineBarCustomAxisLabel({ start, index, count }) ? label : '';
  });
}

export function buildTimelineBarBuckets(byPeriod: CategoryPeriodData | null | undefined): TimelineBarBucket[] {
  if (!byPeriod) {
    return [];
  }

  return Object.entries(byPeriod)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([periodKey, entry]) => {
      const catEvents = Array.isArray(entry?.cat_events) ? entry.cat_events : [];
      const totalSeconds = catEvents.reduce((sum, event) => sum + ensureDuration(event.duration), 0);
      const categoryLabels = Array.from(
        new Set(
          catEvents
            .map(resolveCategoryLabel)
            .filter(label => typeof label === 'string' && label.length > 0)
        )
      );

      return {
        periodKey,
        catEvents,
        totalHours: normalizeHours(totalSeconds),
        categoryLabels,
      };
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
    return {
      start: 0,
      end: Math.max(labelsLength - 1, 0),
    };
  }

  const activeIndexes = Array.from({ length: labelsLength }, (_value, index) => index).filter(index => {
    const bucket = buckets[index];
    return typeof bucket?.totalHours === 'number' && bucket.totalHours > 0;
  });

  if (activeIndexes.length === 0) {
    return {
      start: 0,
      end: Math.max(labelsLength - 1, 0),
    };
  }

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
}) {
  if (!buckets) {
    return [];
  }

  const { start, end } = visibleHourWindow;
  return buckets.slice(start, end + 1);
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
  return {
    labels,
    datasets,
    title: {
      display: true,
      text: 'Timeline',
    },
  };
}

export function buildTimelineBarSelectionOverlay({
  buckets,
  selectedCategoryLabel,
}: {
  buckets: TimelineBarBucket[];
  selectedCategoryLabel: string | null;
}): TimelineBarSelectionOverlay {
  if (!selectedCategoryLabel) {
    return {
      hours: buckets.map(() => 0),
      ratios: buckets.map(() => 0),
    };
  }

  const hours = buckets.map(bucket => {
    const selectedSeconds = bucket.catEvents.reduce((sum, event) => {
      return resolveCategoryLabel(event) === selectedCategoryLabel
        ? sum + ensureDuration(event.duration)
        : sum;
    }, 0);
    return normalizeHours(selectedSeconds);
  });

  return {
    hours,
    ratios: hours.map((selectedHours, index) => {
      const totalHours = buckets[index]?.totalHours ?? 0;
      if (totalHours <= 0 || selectedHours <= 0) {
        return 0;
      }
      return Math.max(0, Math.min(1, selectedHours / totalHours));
    }),
  };
}

function formatTooltipDateLabel(date: Date, periodMode?: ActivityPeriodMode | null, isSingleDay?: boolean) {
  if (isSingleDay) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'numeric',
      day: 'numeric',
    });
  }

  if (periodMode === 'year') {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
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
  periodMode: _periodMode,
  visibleHourWindow,
  dataIndex,
}: {
  start: string | null;
  timeperiodLength: [number, string];
  periodMode?: ActivityPeriodMode | null;
  visibleHourWindow: TimelineBarVisibleWindow;
  dataIndex: number;
}) {
  const bucketDate = new Date(start || Date.now());
  const effectiveIndex = visibleHourWindow.start + dataIndex;
  const [count, resolution] = timeperiodLength;

  if (resolution.startsWith('day') && count === 1) {
    bucketDate.setHours(bucketDate.getHours() + effectiveIndex, 0, 0, 0);
    return bucketDate;
  }

  if (resolution.startsWith('day') || resolution.startsWith('week') || resolution.startsWith('month')) {
    bucketDate.setDate(bucketDate.getDate() + effectiveIndex);
    return bucketDate;
  }

  if (resolution === 'year') {
    bucketDate.setMonth(bucketDate.getMonth() + effectiveIndex, 1);
    return bucketDate;
  }

  return bucketDate;
}

export function buildTimelineBarTooltipPreview({
  buckets,
  start,
  timeperiodLength,
  periodMode,
  visibleHourWindow,
  dataIndex,
}: {
  buckets: TimelineBarBucket[];
  start: string | null;
  timeperiodLength: [number, string];
  periodMode?: ActivityPeriodMode | null;
  visibleHourWindow: TimelineBarVisibleWindow;
  dataIndex: number;
}): TimelineBarTooltipPreview | null {
  const bucket = buckets[dataIndex];
  if (!bucket) {
    return null;
  }

  const bucketStart = resolveTooltipBucketStart({
    start,
    timeperiodLength,
    periodMode,
    visibleHourWindow,
    dataIndex,
  });
  const isSingleDay = isTimelineBarSingleDay(timeperiodLength, periodMode);

  return {
    dateLabel: formatTooltipDateLabel(bucketStart, periodMode, isSingleDay),
    totalDurationLabel: seconds_to_duration(bucket.totalHours * 60 * 60),
  };
}

export function buildTimelineBarTooltipSummary({
  buckets,
  start,
  timeperiodLength,
  periodMode,
  visibleHourWindow,
  dataIndex,
}: {
  buckets: TimelineBarBucket[];
  start: string | null;
  timeperiodLength: [number, string];
  periodMode?: ActivityPeriodMode | null;
  visibleHourWindow: TimelineBarVisibleWindow;
  dataIndex: number;
}): TimelineBarTooltipSummary {
  const preview = buildTimelineBarTooltipPreview({
    buckets,
    start,
    timeperiodLength,
    periodMode,
    visibleHourWindow,
    dataIndex,
  }) || { dateLabel: '', totalDurationLabel: '' };

  const bucket = buckets[dataIndex];
  if (!bucket) {
    return {
      ...preview,
      rows: [],
    };
  }

  const rows = bucket.catEvents
    .map(event => ({
      label: resolveCategoryLabel(event),
      value: normalizeHours(ensureDuration(event.duration)),
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
