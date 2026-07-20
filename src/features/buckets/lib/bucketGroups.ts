import moment from 'moment';
import {
  formatBucketGroupTitle as formatSharedBucketGroupTitle,
  getBucketBaseId,
} from '~/shared/lib/bucketDisplay';

type BucketLike = {
  id?: string;
  hostname?: string;
  data?: Record<string, unknown>;
  first_seen?: string | Date;
  last_updated?: string | Date;
  created?: string | Date;
};

export type BucketGroup = {
  key: string;
  title: string;
  bucketIds: string[];
  buckets: BucketLike[];
  latestActivityMs: number;
  availableDates: string[];
  firstAvailableDate: string;
  latestAvailableDate: string;
};

export function buildBucketGroupKey(bucket: BucketLike | string): string {
  return getBucketBaseId(bucket);
}

export function formatBucketGroupTitle(groupKey: string): string {
  return formatSharedBucketGroupTitle(groupKey);
}

export function buildBucketGroups(buckets: BucketLike[]): BucketGroup[] {
  const grouped = new Map<string, BucketLike[]>();

  for (const bucket of buckets) {
    const key = buildBucketGroupKey(bucket);
    if (!key) continue;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(bucket);
    } else {
      grouped.set(key, [bucket]);
    }
  }

  return Array.from(grouped.entries())
    .map(([key, groupBuckets]) => {
      const availableDates = buildGroupAvailableDates(groupBuckets);
      const latestActivityMs = Math.max(
        ...groupBuckets.map(bucket => parseBucketLatestMs(bucket)),
        0
      );
      return {
        key,
        title: formatBucketGroupTitle(key),
        bucketIds: groupBuckets.map(bucket => String(bucket.id || '')).filter(Boolean),
        buckets: groupBuckets,
        latestActivityMs,
        availableDates,
        firstAvailableDate: availableDates[0] || '',
        latestAvailableDate: availableDates[availableDates.length - 1] || '',
      };
    })
    .sort((left, right) => right.latestActivityMs - left.latestActivityMs || left.title.localeCompare(right.title));
}

export function buildGroupAvailableDates(buckets: BucketLike[]): string[] {
  const dates = new Set<string>();

  for (const bucket of buckets) {
    const start = resolveBucketStart(bucket);
    const end = resolveBucketEnd(bucket);
    if (!start || !end || end.isBefore(start, 'day')) continue;

    const cursor = start.clone().startOf('day');
    const last = end.clone().startOf('day');
    while (cursor.isSameOrBefore(last, 'day')) {
      dates.add(cursor.format('YYYY-MM-DD'));
      cursor.add(1, 'day');
    }
  }

  return Array.from(dates).sort();
}

function resolveBucketStart(bucket: BucketLike): moment.Moment | null {
  const value = bucket.first_seen || bucket.created;
  if (!value) return null;
  const parsed = moment(value);
  return parsed.isValid() ? parsed : null;
}

function resolveBucketEnd(bucket: BucketLike): moment.Moment | null {
  const value = bucket.last_updated || bucket.first_seen || bucket.created;
  if (!value) return null;
  const parsed = moment(value);
  return parsed.isValid() ? parsed : null;
}

function parseBucketLatestMs(bucket: BucketLike): number {
  const end = resolveBucketEnd(bucket);
  return end ? end.valueOf() : 0;
}
