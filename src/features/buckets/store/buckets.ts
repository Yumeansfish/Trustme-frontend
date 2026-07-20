import type { IBucket, IEvent } from '~/shared/lib/interfaces';
import { defineStore } from 'pinia';
import {
  deleteBucket as deleteBucketFromServer,
  fetchBucketEvents,
  fetchBuckets,
} from '~/features/buckets/lib/bucketsClient';
import { useServerStore } from '~/shared/stores/server';
import { cloneJson } from '~/shared/lib/objects';

function select_buckets(
  buckets: IBucket[],
  { host, type }: { host?: string; type?: string }
): string[] {
  return buckets
    .filter(bucket => (!type || bucket.type === type) && (!host || bucket.hostname === host))
    .map(bucket => bucket.id);
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

function dateExtreme(values: Array<Date | undefined>, direction: 'min' | 'max'): Date | undefined {
  const timestamps = values
    .map(value => (value ? new Date(value).getTime() : undefined))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (timestamps.length === 0) return undefined;
  return new Date(direction === 'min' ? Math.min(...timestamps) : Math.max(...timestamps));
}

interface State {
  buckets: IBucket[];
}

type BucketWithEvents = IBucket & {
  events?: IEvent[];
};

type BucketDeviceGroup = {
  buckets: IBucket[];
  device_id?: string;
  device_ids: string[];
  hostname?: string;
  hostnames: string[];
  first_seen?: Date;
  last_updated?: Date;
};

export const useBucketsStore = defineStore('buckets', {
  state: (): State => ({
    buckets: [],
  }),

  getters: {
    hosts(state: State): string[] {
      // TODO: Include consideration of device_id UUID
      let hosts = uniqueStrings(
        state.buckets.map(bucket => bucket.hostname || bucket.data.hostname)
      );
      // sort by last_updated, such that the most recently updated host is first (likely the current host)
      hosts = hosts.sort((left, right) => {
        const latest = (host: string) =>
          Math.max(
            ...(this.bucketsByHostname[host] || []).map(bucket =>
              bucket.last_updated ? new Date(bucket.last_updated).getTime() : 0
            )
          );
        return latest(right) - latest(left);
      });
      return hosts;
    },
    // Uses device_id instead of hostname
    devices(this: State): string[] {
      // TODO: Include consideration of device_id UUID
      return uniqueStrings(
        this.buckets.map(bucket => bucket.device_id || bucket.data.device_id)
      );
    },

    available(): (hostname: string) => {
      window: boolean;
      browser: boolean;
      editor: boolean;
      category: boolean;
      stopwatch: boolean;
    } {
      // Returns a map of which kinds of buckets are available
      //
      // 'window' requires currentwindow + afkstatus buckets
      // 'browser' requires (currentwindow + afk + browser) buckets
      // 'editor' requires editor buckets
      return hostname => {
        const windowAvail =
          this.bucketsWindow(hostname).length > 0 && this.bucketsAFK(hostname).length > 0;
        return {
          window: windowAvail,
          browser: windowAvail && this.bucketsBrowser(hostname).length > 0,
          editor: this.bucketsEditor(hostname).length > 0,
          category: windowAvail,
          stopwatch: this.bucketsStopwatch(hostname).length > 0,
        };
      };
    },

    bucketsByType(
      this: State
    ): (host: string, type: string, fallback_unknown_host?: boolean) => string[] {
      return (host, type, fallback_unknown_host) => {
        let buckets = select_buckets(this.buckets, { host, type });
        if (fallback_unknown_host && buckets.length == 0) {
          buckets = select_buckets(this.buckets, { host: 'unknown', type });
        }
        return buckets;
      };
    },

    // Convenience getters for bucketsByType
    bucketsAFK(): (host: string) => string[] {
      return host => this.bucketsByType(host, 'afkstatus');
    },
    bucketsWindow(): (host: string) => string[] {
      return host => this.bucketsByType(host, 'currentwindow');
    },
    bucketsEditor(): (host: string) => string[] {
      // fallback to a bucket with 'unknown' host, if one exists.
      // TODO: This needs a fix so we can get rid of this workaround.
      return host => this.bucketsByType(host, 'app.editor.activity', true);
    },
    bucketsBrowser(): (host: string) => string[] {
      // fallback to a bucket with 'unknown' host, if one exists.
      // TODO: This needs a fix so we can get rid of this workaround.
      return host => this.bucketsByType(host, 'web.tab.current', true);
    },
    bucketsStopwatch(): (host: string) => string[] {
      // fallback to a bucket with 'unknown' host, if one exists.
      // TODO: This needs a fix so we can get rid of this workaround.
      return (host: string) => this.bucketsByType(host, 'general.stopwatch', true);
    },

    getBucket(this: State): (id: string) => IBucket | undefined {
      return id => this.buckets.find(bucket => bucket.id === id);
    },
    bucketsByHostname(this: State): Record<string, IBucket[]> {
      return this.buckets.reduce<Record<string, IBucket[]>>((groups, bucket) => {
        const key = bucket.hostname || 'unknown';
        (groups[key] ||= []).push(bucket);
        return groups;
      }, {});
    },

    // Group all buckets by their device.
    // Returns a dict with buckets by device/host (hostname or device_id)
    //
    // First element will be the current hostname/device, if present.
    // Others sorted by last_updated.
    bucketsByDevice(state: State): Record<string, BucketDeviceGroup> {
      const grouped = state.buckets.reduce<Record<string, IBucket[]>>((groups, bucket) => {
        const key = bucket.hostname || bucket.device_id || 'unknown';
        (groups[key] ||= []).push(bucket);
        return groups;
      }, {});
      let devices = Object.fromEntries(
        Object.entries(grouped)
          .map(([key, buckets]): [string, BucketDeviceGroup] => {
            const hostnames = uniqueStrings(
              buckets.map(bucket => bucket.hostname || bucket.data.hostname)
            );
            const deviceIds = uniqueStrings(
              buckets.map(bucket => bucket.device_id || bucket.data.device_id)
            );
            return [
              key,
              {
                buckets,
                device_id: deviceIds[0],
                device_ids: deviceIds,
                hostname: hostnames[0],
                hostnames,
                first_seen: dateExtreme(buckets.map(bucket => bucket.first_seen), 'min'),
                last_updated: dateExtreme(buckets.map(bucket => bucket.last_updated), 'max'),
              },
            ];
          })
          .sort((left, right) =>
            (right[1].last_updated ? new Date(right[1].last_updated).getTime() : 0) -
            (left[1].last_updated ? new Date(left[1].last_updated).getTime() : 0)
          )
      );

      // find self-device and put first
      const serverStore = useServerStore();
      const hostname = serverStore.info?.hostname;
      if (!hostname || !Object.prototype.hasOwnProperty.call(devices, hostname)) {
        return devices;
      }
      const currentDevice = devices[hostname];
      if (currentDevice) {
        // remove self from list
        delete devices[hostname];
        // add self-device back to the top;
        devices = { [hostname]: currentDevice, ...devices };
      }
      return devices;
    },
  },

  actions: {
    async ensureLoaded(): Promise<void> {
      if (this.buckets.length === 0) {
        await this.loadBuckets();
      }
    },

    async loadBuckets(): Promise<void> {
      this.update_buckets(await fetchBuckets());
    },

    async getBucketWithEvents({
      id,
      start,
      end,
      limit,
    }: {
      id: string;
      start?: Date;
      end?: Date;
      limit?: number;
    }): Promise<BucketWithEvents> {
      await this.ensureLoaded();
      const bucket = cloneJson(this.getBucket(id)) as BucketWithEvents | undefined;
      if (!bucket) {
        throw new Error(`Unknown bucket: ${id}`);
      }
      bucket.events = await fetchBucketEvents(bucket.id, {
        start,
        end,
        limit: limit || -1,
      });
      return bucket;
    },

    async getBucketsWithEvents({
      start,
      end,
    }: {
      start?: Date;
      end?: Date;
    }): Promise<BucketWithEvents[]> {
      await this.ensureLoaded();
      const buckets = await Promise.all(
        this.buckets.map(bucket => this.getBucketWithEvents({ id: bucket.id, start, end }))
      );
      return buckets.sort((left, right) => left.id.localeCompare(right.id));
    },

    async deleteBucket({ bucketId }: { bucketId: string }) {
      await deleteBucketFromServer(bucketId);
      await this.loadBuckets();
    },

    // mutations
    update_buckets(this: State, buckets: IBucket[]): void {
      this.buckets = [...buckets].sort((left, right) => left.id.localeCompare(right.id)).map(bucket => ({
        ...bucket,
        first_seen: bucket.first_seen ?? bucket.created,
      }));
    },
  },
});
