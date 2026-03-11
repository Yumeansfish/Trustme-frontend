<template>
<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <h2 class="aw-section-title">Raw Data</h2>
    <theme-toggle-button floating></theme-toggle-button>
  </div>
  <section class="aw-card space-y-5 p-5 md:p-6">
    <div v-if="visibleBuckets.length" class="aw-bucket-grid">
      <div
        v-for="bucket in visibleBuckets"
        :key="bucket.id"
        class="aw-shortcut-card aw-bucket-card"
        tabindex="0"
        @click="openBucket(bucket.id)"
        @keydown.enter.self.prevent="openBucket(bucket.id)"
        @keydown.space.self.prevent="openBucket(bucket.id)"
      >
        <div class="flex items-start gap-4">
          <span class="aw-shortcut-card-icon aw-bucket-card-icon">
            <icon :name="bucketIcon(bucket)" class="h-5 w-5"></icon>
          </span>
          <div class="min-w-0 flex-1 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <h4 class="aw-bucket-card-title">{{ bucketTitle(bucket) }}</h4>
              <div class="aw-bucket-card-chevron">
                <icon name="chevron-right" :size="20"></icon>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
              <span class="aw-chip">{{ bucketHostname(bucket) }}</span>
              <span class="aw-chip">{{ bucket.type || 'Unknown Type' }}</span>
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-muted">
              <span>
                Updated:
                <time
                  :class="isRecent(bucket.last_updated) ? 'text-success' : ''"
                  :datetime="bucket.last_updated"
                  :title="bucket.last_updated"
                >
                  {{ formatDate(bucket.last_updated) }}
                </time>
              </span>
              <span>
                First Seen:
                <time :datetime="bucket.first_seen" :title="bucket.first_seen">
                  {{ formatDate(bucket.first_seen) }}
                </time>
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-1" @click.stop>
              <ui-button class="aw-bucket-card-action" type="button" @click.stop="openBucket(bucket.id)">
                <icon name="folder" :size="15"></icon>
                <span>Open</span>
              </ui-button>
              <a
                class="aw-bucket-card-action"
                :href="bucketExportUrl(bucket.id)"
                :download="'aw-bucket-export-' + bucket.id + '.json'"
                title="Export bucket to JSON"
                @click.stop
              >
                <icon name="download" :size="15"></icon>
                <span>JSON</span>
              </a>
              <ui-button class="aw-bucket-card-action" type="button" @click.stop="export_csv(bucket.id)">
                <icon name="download" :size="15"></icon>
                <span>CSV</span>
              </ui-button>
              <ui-button
                class="aw-bucket-card-action aw-bucket-card-action-danger"
                type="button"
                @click.stop="openDeleteBucketModal(bucket.id)"
              >
                <icon name="trash" :size="15"></icon>
                <span>Delete</span>
              </ui-button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="aw-empty py-10">No buckets found.</div>
    <div v-if="visibleBuckets.some(bucket => bucketHostname(bucket) === 'Unknown')" class="aw-device-warning">
      <icon class="mt-0.5 shrink-0 text-warning" name="exclamation-triangle"></icon>
      <span>Some buckets are not attributed to a known hostname.</span>
    </div>
  </section>
</div>
</template>

<script lang="ts">

import _ from 'lodash';
import Papa from 'papaparse';
import moment from 'moment';
import { useDialog } from '~/shared/composables/useDialog';

import { useBucketsStore } from '~/features/buckets/store/buckets';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';

export default {
  name: 'Buckets',
  components: {
    ThemeToggleButton,
  },
  data() {
    return {
      bucketsStore: useBucketsStore(),
    };
  },
  computed: {
    visibleBuckets() {
      return this.sortedBuckets(this.bucketsStore.buckets).filter(bucket => !this.isEmptyBucket(bucket));
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
    bucketHostname: function (bucket) {
      return bucket.hostname || bucket.data?.hostname || bucket.device_id || 'Unknown';
    },
    bucketTitle: function (bucket) {
      const hostname = this.bucketHostname(bucket);
      const suffix = `_${hostname}`;
      return bucket.id.endsWith(suffix) ? bucket.id.slice(0, -suffix.length) : bucket.id;
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
      return _.orderBy(buckets, [bucket => bucket.last_updated, bucket => bucket.id], ['desc', 'asc']);
    },
    bucketIcon: function (bucket) {
      if (bucket.type === 'web.tab.current') return 'globe';
      if (bucket.type === 'app.editor.activity') return 'terminal';
      if (bucket.type === 'afkstatus') return 'clock';
      if (bucket.type === 'currentwindow') return 'desktop';
      if (bucket.type === 'general.stopwatch') return 'stopwatch';
      return 'database';
    },
    bucketExportUrl: function (bucketId: string) {
      return `${this.$aw.baseURL}/api/0/buckets/${bucketId}/export`;
    },
    openBucket: function (bucketId: string) {
      this.$router.push('/buckets/' + bucketId);
    },
    openDeleteBucketModal: async function (bucketId: string) {
      const { confirm } = useDialog();
      const shouldDelete = await confirm({
        title: 'Delete bucket',
        description: `Delete bucket "${bucketId}" permanently? This cannot be undone.`,
        confirmText: 'Delete bucket',
        cancelText: 'Cancel',
      });
      if (!shouldDelete) {
        return;
      }
      await this.deleteBucket(bucketId);
    },
    deleteBucket: async function (bucketId: string) {
      await this.bucketsStore.deleteBucket({ bucketId });
    },

    async export_csv(bucketId: string) {
      const bucket = await this.bucketsStore.getBucketWithEvents({ id: bucketId });
      const events = bucket.events;
      const datakeys = Object.keys(events[0].data);
      const columns = ['timestamp', 'duration'].concat(datakeys);
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
      link.download = `aw-events-export-${bucketId}-${new Date()
        .toISOString()
        .substring(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  },
};
</script>
