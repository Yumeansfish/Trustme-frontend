<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <h2 class="aw-section-title aw-title-system">Raw Data</h2>
      <theme-toggle-button floating></theme-toggle-button>
    </div>
    <section class="aw-card space-y-5 p-5 md:p-6">
      <div v-if="visibleBuckets.length" class="aw-bucket-grid">
        <div
          v-for="bucket in visibleBuckets"
          :key="bucket.key"
          class="aw-shortcut-card aw-bucket-card"
        >
          <div class="min-w-0 flex-1 space-y-4">
            <h4 class="aw-bucket-card-title">{{ bucketTitle(bucket) }}</h4>
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <ui-button
                class="aw-bucket-card-action"
                type="button"
                @click.stop="openBucketGroup(bucket)"
              >
                <icon name="folder" :size="15"></icon>
                <span>Open</span>
              </ui-button>
              <ui-button
                class="aw-bucket-card-action"
                type="button"
                title="Export bucket group to JSON"
                @click.stop="exportGroupJson(bucket)"
              >
                <icon name="download" :size="15"></icon>
                <span>JSON</span>
              </ui-button>
              <ui-button
                class="aw-bucket-card-action"
                type="button"
                @click.stop="exportGroupCsv(bucket)"
              >
                <icon name="download" :size="15"></icon>
                <span>CSV</span>
              </ui-button>
              <ui-button
                class="aw-bucket-card-action aw-bucket-card-action-danger"
                type="button"
                @click.stop="openDeleteBucketModal(bucket)"
              >
                <icon name="trash" :size="15"></icon>
                <span>Delete</span>
              </ui-button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="aw-empty py-10">No buckets found.</div>
    </section>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import Papa from 'papaparse';
import moment from 'moment';
import { useDialog } from '~/shared/composables/useDialog';

import { getClient } from '~/app/lib/awclient';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import { buildBucketGroups, type BucketGroup } from '~/features/buckets/lib/bucketGroups';

type GroupExportEvent = {
  id?: number;
  timestamp: Date;
  duration?: number;
  data: Record<string, unknown>;
  source_bucket_id: string;
};
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';

export default {
  name: 'Buckets',
  components: {
    ThemeToggleButton,
  },
  data() {
    return {
      bucketsStore: useBucketsStore(),
      hiddenGroupKeys: [] as string[],
    };
  },
  computed: {
    visibleBuckets() {
      return buildBucketGroups(
        this.sortedBuckets(this.bucketsStore.buckets).filter(bucket => !this.isEmptyBucket(bucket))
      ).filter(group => !this.hiddenGroupKeys.includes(group.key));
    },
  },
  mounted: async function () {
    // load or reload buckets on mount
    await this.bucketsStore.loadBuckets();
  },
  methods: {
    isRecent: function (date) {
      return moment().diff(date) / 1000 < 120;
    },
    formatDate: function (date) {
      return date ? new Date(date).toLocaleString() : '';
    },
    bucketTitle: function (bucket: BucketGroup) {
      return bucket.title;
    },
    isEmptyBucket: function (bucket) {
      if (!bucket.last_updated) {
        return true;
      }

      const lastUpdated = moment(bucket.last_updated);
      if (!lastUpdated.isValid()) {
        return true;
      }

      return lastUpdated.isBefore(moment().subtract(1, 'month'));
    },
    sortedBuckets: function (buckets) {
      return _.orderBy(
        buckets,
        [bucket => bucket.last_updated, bucket => bucket.id],
        ['desc', 'asc']
      );
    },
    openBucketGroup: function (bucket: BucketGroup) {
      const date = bucket.latestAvailableDate || moment().format('YYYY-MM-DD');
      this.$router.push(`/buckets/group/${encodeURIComponent(bucket.key)}/${date}`);
    },
    openDeleteBucketModal: async function (bucket: BucketGroup) {
      const { confirm: confirmDialog } = useDialog();
      const shouldDelete = await confirmDialog({
        title: 'Delete raw events',
        description: `Delete all events currently stored in ${this.bucketTitle(
          bucket
        )}? This cannot be undone.`,
        confirmText: 'Delete events',
        cancelText: 'Cancel',
      });
      if (!shouldDelete) {
        return;
      }
      await this.deleteBucketGroupEvents(bucket);
    },
    async deleteBucketGroupEvents(bucket: BucketGroup) {
      for (const bucketId of bucket.bucketIds) {
        const sourceBucket = await this.bucketsStore.getBucketWithEvents({ id: bucketId });
        for (const event of sourceBucket.events || []) {
          if (event?.id === undefined || event?.id === null) continue;
          await getClient().deleteEvent(bucketId, event.id);
        }
      }
      this.hiddenGroupKeys = [...this.hiddenGroupKeys, bucket.key];
      await this.bucketsStore.loadBuckets();
    },

    async loadGroupEvents(bucket: BucketGroup): Promise<GroupExportEvent[]> {
      const buckets = await Promise.all(
        bucket.bucketIds.map(async bucketId => {
          const sourceBucket = await this.bucketsStore.getBucketWithEvents({ id: bucketId });
          return (sourceBucket.events || []).map(event => ({
            ...event,
            source_bucket_id: bucketId,
          }));
        })
      );
      return _.orderBy(buckets.flat(), [event => event.timestamp], ['desc']);
    },
    async exportGroupJson(bucket: BucketGroup) {
      const events = await this.loadGroupEvents(bucket);
      const blob = new Blob(
        [
          JSON.stringify(
            {
              group_key: bucket.key,
              bucket_ids: bucket.bucketIds,
              events,
            },
            null,
            2
          ),
        ],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${bucket.key}-${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    async exportGroupCsv(bucket: BucketGroup) {
      const events = await this.loadGroupEvents(bucket);
      if (events.length === 0) {
        return;
      }
      const datakeys: string[] = Array.from(
        new Set<string>(events.flatMap(event => Object.keys(event.data || {})))
      );
      const columns = ['timestamp', 'duration', ...datakeys];
      const data = events.map(e => {
        return Object.assign(
          { timestamp: e.timestamp, duration: e.duration },
          Object.fromEntries(datakeys.map(k => [k, e.data[k]]))
        );
      });
      const csv = Papa.unparse(data, { columns, header: true });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raw-events-export-${bucket.key}-${new Date()
        .toISOString()
        .substring(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  },
};
</script>
