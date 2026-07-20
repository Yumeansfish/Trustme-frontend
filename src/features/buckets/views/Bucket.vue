<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-3">
        <ui-link class="aw-breadcrumb" to="/buckets">
          <icon name="chevron-left" class="h-4 w-4"></icon>
          <span>Back to Raw Data</span>
        </ui-link>
        <div class="space-y-1">
          <h2 class="aw-section-title aw-title-system break-all">{{ bucketDisplayName }}</h2>
          <p class="aw-caption">
            Inspect raw events for this watcher, adjust the queried range, and edit entries without
            leaving the page.
          </p>
        </div>
      </div>
      <theme-toggle-button floating></theme-toggle-button>
    </div>

    <aw-alert v-if="bucketError" variant="warning" show>{{ bucketError }}</aw-alert>
    <aw-alert v-if="eventsError" variant="warning" show>{{ eventsError }}</aw-alert>

    <div v-if="loadingBucket" class="aw-card-muted py-8 text-center text-sm text-foreground-muted">
      Loading Bucket...
    </div>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article v-for="item in summaryCards" :key="item.label" class="aw-card space-y-3">
          <div
            class="flex h-8 w-8 items-center justify-center text-primary"
          >
            <icon :name="item.icon"></icon>
          </div>
          <div class="space-y-1">
            <p class="aw-caption text-xs uppercase tracking-[0.12em]">{{ item.label }}</p>
            <p class="break-all text-sm font-semibold text-foreground-strong">{{ item.value }}</p>
          </div>
        </article>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)]">
        <div class="aw-card space-y-4">
          <div class="space-y-1">
            <h3 class="aw-subtitle text-base">Bucket Data</h3>
            <p class="aw-caption">Metadata attached to this watcher.</p>
          </div>
          <dl v-if="bucketDataEntries.length" class="space-y-3 text-sm">
            <div
              v-for="item in bucketDataEntries"
              :key="item.key"
              class="flex items-start justify-between gap-4"
            >
              <dt class="font-medium text-foreground-muted">{{ item.key }}</dt>
              <dd class="max-w-[68%] break-all text-right text-foreground-strong">
                {{ item.value }}
              </dd>
            </div>
          </dl>
          <div v-else class="aw-empty py-4">No Extra Metadata</div>
        </div>

        <div class="space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <h3 class="aw-subtitle text-base">Events</h3>
              <p class="aw-caption">All events currently stored in this bucket.</p>
            </div>
            <div class="aw-chip">Bucket Total: {{ eventCountLabel }}</div>
          </div>

          <div
            v-if="loadingEvents"
            class="aw-card-muted py-8 text-center text-sm text-foreground-muted"
          >
            Loading Events...
          </div>
          <EventList
            v-else
            :key="eventListKey"
            :bucket-id="id"
            :events="events"
            editable
            @saved="updateEvent"
            @deleted="removeEvent"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import moment from 'moment';

import { countBucketEvents } from '~/features/buckets/lib/bucketsClient';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import EventList from '~/features/buckets/components/EventList.vue';
import type { IBucket, IEvent } from '~/shared/lib/interfaces';
import { formatBucketDisplayName, formatModuleDisplayName } from '~/shared/lib/bucketDisplay';

type BucketRecord = Partial<IBucket> & {
  id: string;
  client?: string;
  data?: Record<string, unknown>;
  events?: IEvent[];
};

export default defineComponent({
  name: 'Bucket',
  components: {
    EventList,
    ThemeToggleButton,
  },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      bucketsStore: useBucketsStore(),
      pageNonce: 0,
      pageRequestKey: 0,
      eventsRequestKey: 0,
      events: [] as IEvent[],
      eventcount: null as number | null,
      loadingBucket: true,
      loadingEvents: false,
      bucketError: '',
      eventsError: '',
    };
  },
  computed: {
    bucket(): BucketRecord {
      return (this.bucketsStore.getBucket(this.id) || { id: this.id, data: {} }) as BucketRecord;
    },
    bucketDataEntries(): Array<{ key: string; value: string }> {
      return Object.entries(this.bucket.data || {}).map(([key, value]) => ({
        key,
        value: this.formatDataValue(value),
      }));
    },
    bucketDisplayName(): string {
      return formatBucketDisplayName(this.bucket);
    },
    eventCountLabel(): string {
      if (this.eventcount === null || Number.isNaN(this.eventcount)) {
        return '-';
      }
      return new Intl.NumberFormat().format(this.eventcount);
    },
    eventListKey(): string {
      return `${this.id}:${this.pageNonce}:event-list:${this.eventsRequestKey}`;
    },
    summaryCards(): Array<{ label: string; value: string; icon: string }> {
      return [
        {
          label: 'Type',
          value: this.bucket.type || 'Unknown',
          icon: 'database',
        },
        {
          label: 'Client',
          value: formatModuleDisplayName(this.bucket.client),
          icon: 'desktop',
        },
        {
          label: 'Hostname',
          value: this.bucket.hostname || 'Unknown',
          icon: 'desktop',
        },
        {
          label: 'Events',
          value: this.eventCountLabel,
          icon: 'stream',
        },
        {
          label: 'Created',
          value: this.formatDate(this.bucket.created),
          icon: 'calendar',
        },
        {
          label: 'First Seen',
          value: this.formatDate(this.bucket.first_seen),
          icon: 'clock',
        },
        {
          label: 'Last Updated',
          value: this.formatDate(this.bucket.last_updated),
          icon: 'clock',
        },
        {
          label: 'Loaded Events',
          value: new Intl.NumberFormat().format(this.events.length),
          icon: 'chart-bar',
        },
      ];
    },
  },
  watch: {
    id: {
      immediate: true,
      handler() {
        void this.reloadBucketPage();
      },
    },
  },
  beforeUnmount() {
    this.cancelPendingLoads();
  },
  methods: {
    cancelPendingLoads() {
      this.pageRequestKey += 1;
      this.eventsRequestKey += 1;
    },
    formatDataValue(value: unknown): string {
      if (value === null || value === undefined || value === '') {
        return '-';
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    },
    formatDate(value: unknown): string {
      if (!value) {
        return '-';
      }
      const date = moment(value);
      return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : String(value);
    },
    async reloadBucketPage() {
      const pageToken = ++this.pageRequestKey;
      this.eventsRequestKey += 1;
      this.pageNonce += 1;
      this.events = [];
      this.eventcount = null;
      this.bucketError = '';
      this.eventsError = '';
      this.loadingBucket = true;
      this.loadingEvents = true;

      try {
        await this.bucketsStore.ensureLoaded();
        const count = await countBucketEvents(this.id);
        if (pageToken !== this.pageRequestKey) {
          return;
        }
        this.eventcount = count;
      } catch (error) {
        if (pageToken !== this.pageRequestKey) {
          return;
        }
        console.error('Failed to load bucket details:', error);
        this.bucketError = 'Failed To Load Bucket Details.';
        this.eventcount = null;
      } finally {
        if (pageToken === this.pageRequestKey) {
          this.loadingBucket = false;
        }
      }

      await this.loadEvents(pageToken);
    },
    async loadEvents(pageToken?: number) {
      const requestedPageToken = pageToken ?? this.pageRequestKey;
      const eventsToken = ++this.eventsRequestKey;
      this.loadingEvents = true;
      this.eventsError = '';

      try {
        const bucket = await this.bucketsStore.getBucketWithEvents({ id: this.id });
        if (requestedPageToken !== this.pageRequestKey || eventsToken !== this.eventsRequestKey) {
          return;
        }
        this.events = Array.isArray(bucket.events) ? bucket.events : [];
      } catch (error) {
        if (requestedPageToken !== this.pageRequestKey || eventsToken !== this.eventsRequestKey) {
          return;
        }
        console.error('Failed to load bucket events:', error);
        this.events = [];
        this.eventsError = 'Failed To Load Bucket Events.';
      } finally {
        if (requestedPageToken === this.pageRequestKey && eventsToken === this.eventsRequestKey) {
          this.loadingEvents = false;
        }
      }
    },
    updateEvent(event: IEvent) {
      const index = this.events.findIndex((existing: IEvent) => {
        return existing.id === event.id;
      });

      if (index !== -1) {
        this.events.splice(index, 1, event);
      }
    },
    removeEvent(event: IEvent) {
      const index = this.events.findIndex(existing => existing.id === event.id);
      if (index === -1) return;
      this.events.splice(index, 1);
      if (typeof this.eventcount === 'number' && this.eventcount > 0) {
        this.eventcount -= 1;
      }
    },
  },
});
</script>
