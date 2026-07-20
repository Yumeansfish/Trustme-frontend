// ActivityWatch event payloads are schemaless and watcher-specific at this boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DynamicEventData = Record<string, any>;

export interface IEvent {
  id?: number;
  timestamp: string;
  duration: number;
  data: DynamicEventData;
}

export interface IBucket {
  id: string;
  hostname: string;
  device_id: string;
  type: string;
  data: DynamicEventData;
  last_updated?: Date;
  first_seen?: Date;
  created?: Date;
}
