import type { IEvent } from '~/shared/lib/interfaces';

export function ensureEventList(events: unknown): IEvent[] {
  if (!Array.isArray(events) || !events.every(event =>
    event !== null && typeof event === 'object' &&
    typeof event.timestamp === 'string' &&
    typeof event.duration === 'number' && Number.isFinite(event.duration) &&
    event.duration >= 0 &&
    event.data !== null && typeof event.data === 'object' && !Array.isArray(event.data)
  )) {
    throw new Error('Invalid activity event list');
  }
  return [...events];
}

export function ensureDuration(duration: unknown): number {
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
    throw new Error('Invalid activity duration');
  }
  return duration;
}
