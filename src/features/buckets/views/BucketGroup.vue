<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex shrink-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div class="space-y-2">
        <ui-link class="aw-breadcrumb" to="/buckets">
          <icon name="chevron-left" class="h-4 w-4"></icon>
          <span>Back to Raw Data</span>
        </ui-link>
        <div>
          <span class="aw-page-title aw-title-system">{{ groupTitle }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <date-navigator
          v-if="selectedDate"
          :model-value="selectedDate"
          :min="firstAvailableDate"
          :max="latestAvailableDate || latestDate"
          :available-dates="availableDates"
          :disable-previous="disablePrevious"
          :disable-next="disableNext"
          icon-only
          @previous="goToDate(previousDate)"
          @next="goToDate(nextDate)"
          @select="goToDate($event)"
        ></date-navigator>
        <theme-toggle-button floating></theme-toggle-button>
      </div>
    </div>

    <aw-alert v-if="error" show variant="warning">{{ error }}</aw-alert>

    <section
      v-if="loading"
      class="aw-card-muted px-6 py-8 text-sm text-foreground-muted"
    >
      Loading raw events...
    </section>

    <section v-else-if="sortedEvents.length" class="aw-panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="aw-card-header shrink-0">
        <div>
          <h4 class="aw-card-title">Events</h4>
          <p class="aw-card-subtitle">
            Showing {{ pageStart }}–{{ pageEnd }} of {{ sortedEvents.length }} events
          </p>
        </div>
        <div v-if="pageCount > 1" class="flex items-center gap-2">
          <ui-button
            class="aw-btn aw-btn-sm aw-btn-secondary"
            type="button"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            Previous
          </ui-button>
          <span class="aw-caption whitespace-nowrap">Page {{ currentPage }} of {{ pageCount }}</span>
          <ui-button
            class="aw-btn aw-btn-sm aw-btn-secondary"
            type="button"
            :disabled="currentPage === pageCount"
            @click="goToPage(currentPage + 1)"
          >
            Next
          </ui-button>
        </div>
      </div>
      <ul ref="eventsList" class="min-h-0 flex-1 overflow-y-auto overscroll-contain whitespace-nowrap" aria-label="Raw events">
        <li
          v-for="(event, eventIndex) in displayEvents"
          :key="eventRowKey(event, eventIndex)"
          class="border-muted border-b px-4 py-3 last:border-b-0"
        >
          <div class="flex flex-wrap items-start gap-2">
            <span class="aw-chip" :title="String(event.timestamp)">
              <icon name="calendar"></icon>{{ formatTimestamp(event.timestamp) }}
            </span>
            <span class="aw-chip">
              <icon name="clock"></icon>{{ friendlyduration(event.duration) }}
            </span>
            <span
              v-for="(val, key) in event.data"
              :key="`${event.source_bucket_id}-${String(key)}`"
              class="aw-chip"
            >
              <icon name="tags"></icon>{{ key }}: {{ val }}
            </span>
            <ui-button
              class="aw-btn aw-btn-sm aw-btn-away-session ml-auto"
              type="button"
              @click="deleteEvent(event)"
            >
              <icon name="trash"></icon>
              <span>Delete</span>
            </ui-button>
          </div>
        </li>
      </ul>
      <div
        v-if="pageCount > 1"
        class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-base px-4 py-3"
      >
        <span class="aw-caption">Page {{ currentPage }} of {{ pageCount }}</span>
        <div class="flex items-center gap-2">
          <ui-button
            class="aw-btn aw-btn-sm aw-btn-secondary"
            type="button"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            Previous
          </ui-button>
          <ui-button
            class="aw-btn aw-btn-sm aw-btn-secondary"
            type="button"
            :disabled="currentPage === pageCount"
            @click="goToPage(currentPage + 1)"
          >
            Next
          </ui-button>
        </div>
      </div>
    </section>

    <section
      v-else
      class="aw-card-muted px-6 py-10 text-center text-sm text-foreground-muted"
    >
      No raw events found for this day.
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import moment from 'moment';
import { useDialog } from '~/shared/composables/useDialog';

import DateNavigator from '~/shared/navigation/DateNavigator.vue';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import { deleteBucketEvent } from '~/features/buckets/lib/bucketsClient';
import { get_today } from '~/app/lib/time';
import { friendlyduration } from '~/shared/lib/filters';
import { buildBucketGroups, type BucketGroup } from '~/features/buckets/lib/bucketGroups';

type GroupEvent = {
  id?: number;
  timestamp: string | Date;
  duration: number;
  data: Record<string, unknown>;
  source_bucket_id: string;
};

const RAW_EVENT_PAGE_SIZE = 100;

export default defineComponent({
  name: 'BucketGroup',
  components: {
    DateNavigator,
    ThemeToggleButton,
  },
  props: {
    groupKey: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      bucketsStore: useBucketsStore(),
      loading: false,
      error: '',
      events: [] as GroupEvent[],
      currentPage: 1,
      availableDates: [] as string[],
      group: null as BucketGroup | null,
    };
  },
  computed: {
    latestDate(): string {
      return get_today();
    },
    selectedDate(): string {
      const parsed = moment(this.date, 'YYYY-MM-DD', true);
      if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
      return this.latestAvailableDate || this.latestDate;
    },
    firstAvailableDate(): string {
      return this.availableDates[0] || '';
    },
    latestAvailableDate(): string {
      return this.availableDates[this.availableDates.length - 1] || '';
    },
    previousDate(): string {
      return moment(this.selectedDate, 'YYYY-MM-DD', true).subtract(1, 'day').format('YYYY-MM-DD');
    },
    nextDate(): string {
      return moment(this.selectedDate, 'YYYY-MM-DD', true).add(1, 'day').format('YYYY-MM-DD');
    },
    disablePrevious(): boolean {
      return this.availableDates.length > 0
        ? !this.availableDates.includes(this.previousDate)
        : false;
    },
    disableNext(): boolean {
      return this.availableDates.length > 0 ? !this.availableDates.includes(this.nextDate) : false;
    },
    sortedEvents(): GroupEvent[] {
      return [...this.events].sort((left, right) => {
        return moment(right.timestamp).valueOf() - moment(left.timestamp).valueOf();
      });
    },
    pageCount(): number {
      return Math.max(1, Math.ceil(this.sortedEvents.length / RAW_EVENT_PAGE_SIZE));
    },
    pageStart(): number {
      if (!this.sortedEvents.length) return 0;
      return (this.currentPage - 1) * RAW_EVENT_PAGE_SIZE + 1;
    },
    pageEnd(): number {
      return Math.min(this.currentPage * RAW_EVENT_PAGE_SIZE, this.sortedEvents.length);
    },
    displayEvents(): GroupEvent[] {
      const start = (this.currentPage - 1) * RAW_EVENT_PAGE_SIZE;
      return this.sortedEvents.slice(start, start + RAW_EVENT_PAGE_SIZE);
    },
    groupTitle(): string {
      return this.group?.title || 'bucket';
    },
  },
  watch: {
    groupKey: {
      immediate: true,
      async handler() {
        await this.loadGroup();
      },
    },
    date: {
      immediate: true,
      async handler() {
        if (this.group) {
          await this.loadEvents();
        }
      },
    },
  },
  methods: {
    friendlyduration,
    buildRoute(date: string) {
      return `/buckets/group/${encodeURIComponent(this.groupKey)}/${date}`;
    },
    goToDate(date: string) {
      if (date === this.selectedDate) return;
      this.$router.push(this.buildRoute(date)).catch(() => undefined);
    },
    goToPage(page: number) {
      this.currentPage = Math.max(1, Math.min(page, this.pageCount));
      this.$nextTick(() => {
        const list = this.$refs.eventsList as HTMLUListElement | undefined;
        if (list) list.scrollTop = 0;
      });
    },
    formatTimestamp(value: string | Date): string {
      return moment(value).format('YYYY-MM-DD HH:mm:ss');
    },
    eventRowKey(event: GroupEvent, index: number): string {
      return `${event.source_bucket_id}:${event.id ?? index}`;
    },
    async loadGroup() {
      this.loading = true;
      this.error = '';
      this.events = [];
      try {
        await this.bucketsStore.ensureLoaded();
        const groups = buildBucketGroups(this.bucketsStore.buckets);
        this.group = groups.find(group => group.key === this.groupKey) || null;
        this.availableDates = this.group?.availableDates || [];

        if (!this.group) {
          this.error = 'Failed to load raw bucket group.';
          return;
        }

        if (!this.date) {
          const fallbackDate = this.latestAvailableDate || this.latestDate;
          if (fallbackDate) {
            await this.$router.replace(this.buildRoute(fallbackDate));
            return;
          }
        }

        await this.loadEvents();
      } catch (error) {
        console.error('Failed to load raw bucket group', error);
        this.error = 'Failed to load raw bucket group.';
      } finally {
        this.loading = false;
      }
    },
    async loadEvents() {
      if (!this.group) return;
      this.loading = true;
      this.error = '';
      this.currentPage = 1;
      try {
        const start = moment(this.selectedDate, 'YYYY-MM-DD', true).startOf('day').toDate();
        const end = moment(this.selectedDate, 'YYYY-MM-DD', true).endOf('day').toDate();
        const bucketResults = await Promise.all(
          this.group.bucketIds.map(async bucketId => {
            const bucket = await this.bucketsStore.getBucketWithEvents({
              id: bucketId,
              start,
              end,
            });
            return (bucket.events || []).map(event => ({
              ...event,
              source_bucket_id: bucketId,
            }));
          })
        );
        this.events = bucketResults.flat();
      } catch (error) {
        console.error('Failed to load raw bucket group events', error);
        this.events = [];
        this.error = 'Failed to load raw events.';
      } finally {
        this.loading = false;
      }
    },
    async deleteEvent(event: GroupEvent) {
      if (!event.source_bucket_id || event.id === undefined || event.id === null) {
        return;
      }
      const { confirm } = useDialog();
      const shouldDelete = await confirm({
        title: 'Delete event',
        description: 'Delete this raw event permanently? This cannot be undone.',
        confirmText: 'Delete event',
        cancelText: 'Cancel',
      });
      if (!shouldDelete) {
        return;
      }
      await deleteBucketEvent(event.source_bucket_id, Number(event.id));
      this.events = this.events.filter(entry => {
        return !(entry.source_bucket_id === event.source_bucket_id && entry.id === event.id);
      });
      if (this.currentPage > this.pageCount) {
        this.currentPage = this.pageCount;
      }
    },
  },
});
</script>
