<template>
<div class="space-y-8 pb-8 md:space-y-10 md:pb-10">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <h2 class="aw-section-title">Timeline</h2>
    <theme-toggle-button floating></theme-toggle-button>
  </div>

  <aw-alert v-if="errorMessage" variant="warning" show>{{ errorMessage }}</aw-alert>

  <div
    v-if="loading"
    class="aw-card-muted flex min-h-[20rem] items-center justify-center text-sm text-foreground-muted"
  >
    Loading Timeline...
  </div>
  <template v-else>
    <aw-alert v-if="num_events === 0" class="mt-2" variant="warning" show>
      No recent activity was found in the last 30 minutes.
    </aw-alert>
    <section class="aw-card p-6 md:p-7">
      <div class="flex flex-col gap-4 md:gap-5">
        <timeline-lane-card
          laneType="status"
          title="Status"
          description=""
          icon="clock"
          :buckets="statusBuckets"
          :daterange="daterange"
          emptyMessage="No recent status changes."
          @request-refresh="refreshTimeline"
        ></timeline-lane-card>

        <timeline-lane-card
          laneType="app"
          title="App Focus"
          description=""
          icon="desktop"
          :buckets="appFocusBuckets"
          :daterange="daterange"
          emptyMessage="No recent app activity."
          @request-refresh="refreshTimeline"
        ></timeline-lane-card>
      </div>
    </section>
  </template>
</div>
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';
import { defineComponent } from 'vue';

import { useBucketsStore } from '~/features/buckets/store/buckets';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import TimelineLaneCard from '~/features/timeline/components/TimelineLaneCard.vue';
import { useServerStore } from '~/shared/stores/server';

const LOOKBACK_MINUTES = 30;
const REFRESH_INTERVAL_MS = 30 * 1000;

type TimelineBucket = {
  id: string;
  type: string;
  hostname?: string;
  client?: string;
  events: any[];
  groupId: string;
  groupLabel: string;
};

export default defineComponent({
  name: 'Timeline',
  components: {
    ThemeToggleButton,
    TimelineLaneCard,
  },
  data() {
    return {
      bucketsStore: useBucketsStore(),
      serverStore: useServerStore(),
      buckets: [] as TimelineBucket[],
      daterange: null as [moment.Moment, moment.Moment] | null,
      loading: true,
      errorMessage: '',
      refreshTimer: null as ReturnType<typeof setInterval> | null,
      lastRefreshedAt: null as moment.Moment | null,
    };
  },
  computed: {
    num_events() {
      return _.sumBy(this.buckets || [], 'events.length');
    },
    statusBuckets(): TimelineBucket[] {
      return (this.buckets || []).filter(bucket => bucket.groupId === 'status');
    },
    appFocusBuckets(): TimelineBucket[] {
      return (this.buckets || []).filter(bucket => bucket.groupId === 'app-focus');
    },
  },
  async mounted() {
    await this.refreshTimeline();
    this.refreshTimer = setInterval(() => {
      void this.refreshTimeline();
    }, REFRESH_INTERVAL_MS);
  },
  beforeUnmount() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },
  methods: {
    getCurrentHostname(): string | null {
      return this.serverStore.info?.hostname || this.bucketsStore.hosts?.[0] || null;
    },
    buildRange(): [moment.Moment, moment.Moment] {
      const end = moment();
      const start = end.clone().subtract(LOOKBACK_MINUTES, 'minutes');
      return [start, end];
    },
    getRelevantBucketIds(hostname: string): string[] {
      return _.uniq([
        ...this.bucketsStore.bucketsAFK(hostname),
        ...this.bucketsStore.bucketsWindow(hostname),
        ...this.bucketsStore.bucketsBrowser(hostname),
        ...this.bucketsStore.bucketsEditor(hostname),
        ...this.bucketsStore.bucketsStopwatch(hostname),
        ...this.bucketsStore.bucketsAndroid(hostname),
      ]);
    },
    getGroupMeta(bucket: { type?: string }) {
      if (bucket.type === 'afkstatus') {
        return {
          groupId: 'status',
          groupLabel: 'Status',
        };
      }

      return {
        groupId: 'app-focus',
        groupLabel: 'App Focus',
      };
    },
    async refreshTimeline() {
      this.loading = true;
      this.errorMessage = '';

      try {
        if (!this.serverStore.info) {
          await this.serverStore.getInfo();
        }
        await this.bucketsStore.ensureLoaded();

        const hostname = this.getCurrentHostname();
        if (!hostname) {
          this.buckets = [];
          this.daterange = this.buildRange();
          this.errorMessage = 'Unable to resolve the current device.';
          return;
        }

        const [start, end] = this.buildRange();
        const bucketIds = this.getRelevantBucketIds(hostname);
        const bucketResults = await Promise.all(
          bucketIds.map(async id => {
            const bucket = await this.bucketsStore.getBucketWithEvents({
              id,
              start: start.format(),
              end: end.format(),
            });

            return {
              ...bucket,
              ...this.getGroupMeta(bucket),
            };
          })
        );

        this.daterange = [start, end];
        this.buckets = bucketResults.filter(bucket => Array.isArray(bucket.events) && bucket.events.length);
        this.lastRefreshedAt = moment();
      } catch (error) {
        console.error('Failed to refresh timeline:', error);
        this.errorMessage = 'Failed to load the live timeline.';
        this.buckets = [];
        this.daterange = this.buildRange();
      } finally {
        this.loading = false;
      }
    },
  },
});
</script>
