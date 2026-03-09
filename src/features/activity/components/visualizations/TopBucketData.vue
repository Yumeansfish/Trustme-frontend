<template>
<div class="space-y-3">
  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-1">
      <span class="aw-label">Bucket</span>
      <ui-select class="aw-select" v-model="selectedBucketId" :disabled="bucketOptions.length === 0 || loading">
        <option v-for="option in bucketOptions" :key="option.value" :value="option.value">{{ option.text }}</option>
      </ui-select>
    </label>
    <label class="flex flex-col gap-1">
      <span class="aw-label">
        Field in event data
        <span class="aw-help-badge ml-1" title="Field names come from event data. Dot notation is supported (e.g., data.title).">i</span>
      </span>
      <ui-select class="aw-select" v-model="selectedField" :disabled="!selectedBucketId || loading">
        <option v-for="option in fieldSelectOptions" :key="option.value" :value="option.value">{{ option.text }}</option>
      </ui-select>
      <ui-input class="aw-input mt-2" v-if="selectedField === '__custom' || fieldOptions.length === 0" v-model="customField" placeholder="e.g. data.title" :disabled="loading" />
    </label>
  </div>
  <aw-alert v-if="error" show variant="danger">{{ error }}</aw-alert>
  <aw-alert v-else-if="!selectedBucketId" show variant="info">Select a watcher to load events for this period.</aw-alert>
  <aw-alert v-else-if="!loading && aggregated.length === 0" show variant="warning">No events found for this watcher and time range.</aw-alert>
  <div>
    <div class="text-foreground-muted flex items-center justify-center gap-2 py-4 text-sm" v-if="loading">
      <icon name="spinner" pulse></icon>
      <span>Loading events...</span>
    </div>
    <aw-summary v-else-if="aggregated.length" :fields="aggregated" :namefunc="namefunc" :hoverfunc="hoverfunc" :colorfunc="colorfunc" with_limit></aw-summary>
    <div class="aw-empty" v-else>Pick a field to see results.</div>
  </div>
</div>
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';
import { useActivityStore } from '~/features/activity/store/activity';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import { getClient } from '~/app/lib/awclient';
interface AggregatedEvent {
  duration: number;
  data: Record<string, any>;
}
function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(' > ');
  if (value === null || value === undefined) return 'Unknown';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
export default {
  name: 'aw-top-bucket-data',
  props: {
    initialBucketId: { type: String, default: '' },
    initialField: { type: String, default: '' },
    initialCustomField: { type: String, default: '' },
  },
  data() {
    return {
      bucketsStore: useBucketsStore(),
      activityStore: useActivityStore(),
      selectedBucketId: this.initialBucketId || '',
      selectedField: this.initialField || '',
      customField: this.initialCustomField || '',
      fieldOptions: [] as string[],
      events: [] as any[],
      aggregated: [] as AggregatedEvent[],
      loading: false,
      error: '',
    };
  },
  computed: {
    bucketOptions(): { value: string; text: string }[] {
      return this.bucketsStore.buckets.map(b => ({
        value: b.id,
        text: `${b.id} (${b.type || 'unknown'})`,
      }));
    },
    fieldSelectOptions(): { value: string; text: string }[] {
      const options = this.fieldOptions.map(f => ({ value: f, text: f }));
      options.push({ value: '__custom', text: 'Custom field…' });
      return options;
    },
    selectedFieldValue(): string {
      if (this.selectedField === '__custom') return this.customField;
      return this.selectedField;
    },
    timeRange(): { start: string; end: string } | null {
      const opts = this.activityStore.query_options;
      if (!opts || !opts.timeperiod) return null;
      const start = opts.timeperiod.start;
      const end = moment(start)
        .add(...opts.timeperiod.length)
        .toISOString();
      return { start, end };
    },
    namefunc(): (e: AggregatedEvent) => string {
      return e => e.data.display;
    },
    hoverfunc(): (e: AggregatedEvent) => string {
      return e => e.data.display;
    },
    colorfunc(): (e: AggregatedEvent) => string {
      return e => e.data.colorKey;
    },
  },
  watch: {
    selectedBucketId: function () {
      this.emitSelection();
      this.loadEvents();
    },
    selectedField: function () {
      this.emitSelection();
      this.aggregate();
    },
    customField: function () {
      if (this.selectedField === '__custom') {
        this.emitSelection();
        this.aggregate();
      }
    },
    timeRange() {
      this.loadEvents();
    },
  },
  async mounted() {
    await this.bucketsStore.ensureLoaded();
    this.setDefaultBucket();
    this.emitSelection();
    if (this.selectedBucketId) {
      await this.loadEvents();
    }
  },
  methods: {
    setDefaultBucket() {
      if (this.selectedBucketId) return;
      const host = this.activityStore.query_options && this.activityStore.query_options.host;
      const byHost = host ? this.bucketsStore.buckets.filter(b => b.hostname === host) : [];
      if (byHost.length > 0) {
        this.selectedBucketId = byHost[0].id;
      } else if (this.bucketsStore.buckets.length > 0) {
        this.selectedBucketId = this.bucketsStore.buckets[0].id;
      }
    },
    async loadEvents() {
      if (!this.selectedBucketId || !this.timeRange) return;
      this.loading = true;
      this.error = '';
      this.aggregated = [];
      try {
        this.events = await getClient().getEvents(this.selectedBucketId, {
          start: this.timeRange.start,
          end: this.timeRange.end,
          limit: -1,
        });
        this.fieldOptions = this.extractFields(this.events);
        if (!this.selectedField && this.fieldOptions.length > 0) {
          this.selectedField = this.fieldOptions[0];
        } else if (!this.selectedField && this.fieldOptions.length === 0) {
          this.selectedField = '__custom';
        }
        this.aggregate();
      } catch (err) {
        console.error(err);
        this.events = [];
        this.fieldOptions = [];
        this.error = err?.message || 'Failed to load events for the selected watcher.';
      } finally {
        this.loading = false;
      }
    },
    extractFields(events: any[]): string[] {
      // Sample first 100 events for field discovery (performance vs coverage tradeoff)
      const keys = new Set<string>();
      events.slice(0, 100).forEach(e => {
        Object.keys(e.data || {}).forEach(k => keys.add(k));
      });
      return Array.from(keys).sort();
    },
    aggregate() {
      const fieldValue = (this.selectedFieldValue || '').trim();
      if (!fieldValue) {
        this.aggregated = [];
        return;
      }
      // Even though the user should start the manual data fields with "data", we want
      // to gracefully let it pass. Chances are there are no nested data.data.title.
      const path = fieldValue.startsWith('data.') ? fieldValue : `data.${fieldValue}`;
      const grouped = new Map<string, AggregatedEvent>();
      this.events.forEach(e => {
        const value = _.get(e, path);
        const display = formatValue(value);
        const key = Array.isArray(value) ? JSON.stringify(value) : String(display);
        if (!grouped.has(key)) {
          grouped.set(key, {
            duration: 0,
            data: { display, raw: value, colorKey: display },
          });
        }
        const entry = grouped.get(key);
        entry.duration += e.duration || 0;
      });
      this.aggregated = Array.from(grouped.values()).sort((a, b) => b.duration - a.duration);
    },
    emitSelection() {
      this.$emit('update-props', {
        bucketId: this.selectedBucketId,
        field: this.selectedField === '__custom' ? '__custom' : this.selectedField,
        customField: this.selectedField === '__custom' ? this.customField : '',
      });
    },
  },
};
</script>
