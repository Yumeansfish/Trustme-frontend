import _ from 'lodash';

export type AwaySessionEvent = {
  timestamp?: string | Date;
  duration?: number | string;
  data?: Record<string, unknown>;
};

export function orderAwaySessionEvents(events: AwaySessionEvent[]): AwaySessionEvent[] {
  return _.orderBy(events, event => event.timestamp, 'desc');
}
