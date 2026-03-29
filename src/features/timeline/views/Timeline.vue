<template>
<div class="space-y-8 pb-8 md:space-y-10 md:pb-10">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div class="space-y-2">
      <button
        v-if="showBreadcrumb"
        type="button"
        class="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground-emphasis"
        @click="goBackToReturnPage"
      >
        <icon name="chevron-left" class="h-4 w-4"></icon>
        <span>{{ breadcrumbLabel }}</span>
      </button>
      <h2 class="aw-section-title aw-title-system">Timeline</h2>
    </div>
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
    <section class="aw-card p-6 md:p-7">
      <div class="flex flex-col gap-4 md:gap-5">
        <timeline-lane-card
          laneType="status"
          title="Status"
          description=""
          icon="clock"
          :segments="statusLane.segments"
          :eventCount="statusLane.event_count"
          :daterange="daterange"
          emptyMessage="No recent status changes."
        ></timeline-lane-card>

        <timeline-lane-card
          laneType="app"
          title="App Focus"
          description=""
          icon="desktop"
          :segments="appFocusLane.segments"
          :eventCount="appFocusLane.event_count"
          :daterange="daterange"
          emptyMessage="No recent app activity."
        ></timeline-lane-card>
      </div>
    </section>
  </template>
</div>
</template>

<script lang="ts">
import moment from 'moment';
import { defineComponent } from 'vue';

import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import TimelineLaneCard from '~/features/timeline/components/TimelineLaneCard.vue';
import { fetchTimeline } from '~/features/timeline/lib/timelineClient';
import {
  buildTimelineRange,
  parseTimelineFixedRange,
} from '~/features/timeline/lib/timelineViewState';
import type { TimelineLane } from '~/shared/contracts/activity.generated';

const REFRESH_INTERVAL_MS = 30 * 1000;

const emptyLane = (): TimelineLane => ({ event_count: 0, segments: [] });

export default defineComponent({
  name: 'Timeline',
  components: {
    ThemeToggleButton,
    TimelineLaneCard,
  },
  data() {
    return {
      statusLane: emptyLane(),
      appFocusLane: emptyLane(),
      daterange: null as [moment.Moment, moment.Moment] | null,
      loading: true,
      errorMessage: '',
      refreshTimer: null as ReturnType<typeof setInterval> | null,
      lastRefreshedAt: null as moment.Moment | null,
    };
  },
  computed: {
    returnToPath(): string {
      return typeof this.$route.query.returnTo === 'string' ? this.$route.query.returnTo : '';
    },
    breadcrumbLabel(): string {
      const label = typeof this.$route.query.returnLabel === 'string' ? this.$route.query.returnLabel : '';
      return label ? `Back to ${label}` : 'Back';
    },
    showBreadcrumb(): boolean {
      return this.returnToPath.length > 0;
    },
  },
  async mounted() {
    this.syncRefreshTimer();
    await this.refreshTimeline();
  },
  watch: {
    '$route.fullPath': {
      async handler() {
        this.syncRefreshTimer();
        await this.refreshTimeline();
      },
    },
  },
  beforeUnmount() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },
  methods: {
    parseFixedRange(): [moment.Moment, moment.Moment] | null {
      return parseTimelineFixedRange(this.$route.query);
    },
    syncRefreshTimer() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }

      if (this.parseFixedRange()) {
        return;
      }

      this.refreshTimer = setInterval(() => {
        this.refreshTimeline().catch(() => undefined);
      }, REFRESH_INTERVAL_MS);
    },
    buildRange(): [moment.Moment, moment.Moment] {
      return buildTimelineRange(this.$route.query);
    },
    goBackToReturnPage() {
      if (!this.returnToPath) {
        return;
      }
      this.$router.push(this.returnToPath).catch(() => undefined);
    },
    async refreshTimeline() {
      this.loading = true;
      this.errorMessage = '';

      try {
        const [start, end] = this.buildRange();
        const timeline = await fetchTimeline({ start: start.toDate(), end: end.toDate() });

        this.daterange = [moment(timeline.range_start), moment(timeline.range_end)];
        this.statusLane = timeline.status;
        this.appFocusLane = timeline.app_focus;
        this.lastRefreshedAt = moment();
      } catch (error) {
        console.error('Failed to refresh timeline:', error);
        this.errorMessage = 'Failed to load the live timeline.';
        this.statusLane = emptyLane();
        this.appFocusLane = emptyLane();
        this.daterange = this.buildRange();
      } finally {
        this.loading = false;
      }
    },
  },
});
</script>
