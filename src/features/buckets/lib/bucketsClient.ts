import type { IEvent as AwClientEvent } from 'aw-client';

import { getClient } from '~/app/lib/awclient';
import type { IBucket, IEvent } from '~/shared/lib/interfaces';

export async function fetchBuckets(): Promise<IBucket[]> {
  const buckets = (await getClient().getBuckets()) as unknown as Record<string, IBucket>;
  return Object.values(buckets);
}

export async function fetchBucketEvents(
  bucketId: string,
  options: { start?: Date; end?: Date; limit?: number } = {}
): Promise<IEvent[]> {
  return (await getClient().getEvents(bucketId, options)) as unknown as IEvent[];
}

export async function fetchBucketEvent(bucketId: string, eventId: number): Promise<IEvent> {
  return (await getClient().getEvent(bucketId, eventId)) as unknown as IEvent;
}

export async function countBucketEvents(bucketId: string): Promise<number | null> {
  const response = await getClient().countEvents(bucketId);
  const count = Number(response.data);
  return Number.isNaN(count) ? null : count;
}

export type BucketEventWrite = Omit<IEvent, 'timestamp'> & { timestamp: string | Date };

export async function replaceBucketEvent(bucketId: string, event: BucketEventWrite): Promise<void> {
  await getClient().replaceEvent(bucketId, event as unknown as AwClientEvent);
}

export async function deleteBucketEvent(bucketId: string, eventId: number): Promise<void> {
  await getClient().deleteEvent(bucketId, eventId);
}

export async function deleteBucket(bucketId: string): Promise<void> {
  await getClient().deleteBucket(bucketId);
}
