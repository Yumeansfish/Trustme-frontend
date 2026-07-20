import type { IEvent as AwClientEvent } from 'aw-client';

import { getClient } from '~/app/lib/awclient';
import type { AwaySessionEvent } from './awaySessionRuntime';

export async function ensureAwaySessionBucket(bucketId: string): Promise<void> {
  await getClient().ensureBucket(bucketId, 'general.stopwatch', 'unknown');
}

export async function startAwaySessionHeartbeat(
  bucketId: string,
  event: AwaySessionEvent
): Promise<void> {
  await getClient().heartbeat(bucketId, 1, event as unknown as AwClientEvent);
}

export async function replaceAwaySessionEvent(
  bucketId: string,
  event: AwaySessionEvent
): Promise<void> {
  await getClient().replaceEvent(bucketId, event as unknown as AwClientEvent);
}

export async function fetchAwaySessionEvents(bucketId: string): Promise<AwaySessionEvent[]> {
  return (await getClient().getEvents(bucketId, { limit: 100 })) as unknown as AwaySessionEvent[];
}
