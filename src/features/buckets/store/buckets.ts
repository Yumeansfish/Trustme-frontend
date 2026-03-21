import _ from 'lodash';

import type { IBucket, IEvent } from '~/shared/lib/interfaces';
import { defineStore } from 'pinia';
import { getClient } from '~/app/lib/awclient';
import { useServerStore } from '~/shared/stores/server';

function select_buckets(
  buckets: IBucket[],
  { host, type }: { host?: string; type?: string }
): string[] {
  return _.map(
    _.filter(
      buckets,
      bucket => (!type || bucket.type === type) && (!host || bucket.hostname == host)
    ),
    bucket => bucket['id']
  );
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
      let hosts = _.uniq(
        _.map(state.buckets, bucket => bucket.hostname || bucket.data.hostname).filter(
          (host): host is string => typeof host === 'string' && host.length > 0
        )
      );
      // sort by last_updated, such that the most recently updated host is first (likely the current host)
      hosts = _.orderBy(
        hosts,
        host => _.max(_.map(this.bucketsByHostname[host], b => b.last_updated)),
        ['desc']
      );
      return hosts;
    },
    // Uses device_id instead of hostname
    devices(this: State): string[] {
      // TODO: Include consideration of device_id UUID
      return _.uniq(
        _.map(this.buckets, bucket => bucket.device_id || bucket.data.device_id).filter(
          (deviceId): deviceId is string => typeof deviceId === 'string' && deviceId.length > 0
        )
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
      return id => _.filter(this.buckets, b => b.id === id)[0];
    },
    bucketsByHostname(this: State): Record<string, IBucket[]> {
      return _.groupBy(this.buckets, 'hostname');
    },

    // Group all buckets by their device.
    // Returns a dict with buckets by device/host (hostname or device_id)
    //
    // First element will be the current hostname/device, if present.
    // Others sorted by last_updated.
    bucketsByDevice(state: State): Record<string, BucketDeviceGroup> {
      let devices: Record<string, BucketDeviceGroup> = _.mapValues(
        _.groupBy(state.buckets, b => b.hostname || b.device_id),
        d => {
          const hostnames = _.uniq(
            _.map(d, b => b.hostname || b.data.hostname).filter(
              (host): host is string => typeof host === 'string' && host.length > 0
            )
          );
          const device_ids = _.uniq(
            _.map(d, b => b.data.device_id || b.hostname).filter(
              (deviceId): deviceId is string =>
                typeof deviceId === 'string' && deviceId.length > 0
            )
          );
          return {
            buckets: d,
            device_id: device_ids[0],
            device_ids,
            hostname: hostnames[0],
            hostnames,
            first_seen: _.min(_.map(d, b => b.first_seen)),
            last_updated: _.max(_.map(d, b => b.last_updated)),
          };
        }
      );

      // Sort by last_updated
      const sortObjectByUpdated = _.flow([
        _.toPairs,
        pairs =>
          _.orderBy(
            pairs as Array<[string, BucketDeviceGroup]>,
            pair => pair[1].last_updated,
            ['desc']
          ),
        pairs => _.fromPairs(pairs) as Record<string, BucketDeviceGroup>,
      ]) as (value: Record<string, BucketDeviceGroup>) => Record<string, BucketDeviceGroup>;
      devices = sortObjectByUpdated(devices);

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
      const buckets = Object.values(
        (await getClient().getBuckets()) as unknown as Record<string, IBucket>
      );
      this.update_buckets(buckets);
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
      const bucket = _.cloneDeep(this.getBucket(id)) as BucketWithEvents | undefined;
      if (!bucket) {
        throw new Error(`Unknown bucket: ${id}`);
      }
      bucket.events = (await getClient().getEvents(bucket.id, {
        start,
        end,
        limit: limit || -1,
      })) as unknown as IEvent[];
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
        _.map(
          this.buckets,
          async bucket => await this.getBucketWithEvents({ id: bucket.id, start, end })
        )
      );
      return _.orderBy(buckets, [b => b.id], ['asc']);
    },

    async deleteBucket({ bucketId }: { bucketId: string }) {
      await getClient().deleteBucket(bucketId);
      await this.loadBuckets();
    },

    // mutations
    update_buckets(this: State, buckets: IBucket[]): void {
      this.buckets = _.orderBy(buckets, [b => b.id], ['asc']).map(b => {
        // Some harmonization as the Rust and legacy Python server APIs diverge slightly
        if (!b.last_updated && b.metadata?.end) {
          b.last_updated = b.metadata.end;
        }
        if (!b.first_seen && b.metadata?.start) {
          b.first_seen = b.metadata.start;
        }
        if (!b.first_seen && b.created) {
          b.first_seen = b.created;
        }

        return b;
      });
    },
  },
});
