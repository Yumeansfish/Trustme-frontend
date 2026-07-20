export type AwaySessionEvent = {
  id?: number;
  timestamp?: string | Date;
  duration?: number;
  data?: Record<string, unknown>;
};

export function orderAwaySessionEvents(events: AwaySessionEvent[]): AwaySessionEvent[] {
  return [...events].sort(
    (left, right) => new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime()
  );
}
