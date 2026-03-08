<template>
<div class="space-y-4">
  <h2 class="aw-section-title">Timeline</h2>
  <input-timeinterval class="mb-3" v-model="daterange" :defaultDuration="timeintervalDefaultDuration" :maxDuration="maxDuration"></input-timeinterval>
  <div class="flex flex-wrap items-start gap-3">
    <div class="aw-chip">Events shown: {{ num_events }}</div>
    <label class="aw-card flex items-center gap-2 px-3 py-2 text-sm text-foreground"><span class="font-medium">Swimlanes</span>
      <select class="aw-select-sm" v-model="swimlane">
        <option :value="null">None</option>
        <option value="category">Categories</option>
        <option value="bucketType">Bucket specific</option>
      </select>
    </label>
    <label class="aw-card flex items-center gap-2 px-3 py-2 text-sm text-foreground"><span class="font-medium">Duration</span>
      <select class="aw-select-sm" v-model="filter_duration">
        <option :value="null">All</option>
        <option :value="2">2+ secs</option>
        <option :value="5">5+ secs</option>
        <option :value="10">10+ secs</option>
        <option :value="30">30+ sec</option>
        <option :value="1 * 60">1+ mins</option>
        <option :value="2 * 60">2+ mins</option>
        <option :value="3 * 60">3+ mins</option>
        <option :value="10 * 60">10+ mins</option>
        <option :value="30 * 60">30+ mins</option>
        <option :value="1 * 60 * 60">1+ hrs</option>
        <option :value="2 * 60 * 60">2+ hrs</option>
      </select>
    </label>
    <details class="aw-card-muted max-w-xl">
      <summary class="cursor-pointer list-none text-sm font-medium text-foreground"><span>Filters: {{ filter_summary }}</span></summary>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1"><span class="aw-label">Host</span>
          <select class="aw-select-sm" v-model="filter_hostname">
            <option :value="null">All</option>
            <option v-for="host in hosts" :key="host" :value="host">{{ host }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1"><span class="aw-label">Client</span>
          <select class="aw-select-sm" v-model="filter_client">
            <option :value="null">All</option>
            <option v-for="client in clients" :key="client" :value="client">{{ client }}</option>
          </select>
        </label>
      </div>
    </details>
    <p class="ml-auto pt-2 text-sm text-foreground-subtle">Drag to pan and scroll to zoom</p>
  </div>
  <aw-alert class="mt-2" v-if="num_events === 0" variant="warning" show>No events match selected criteria. Timeline is not updated.</aw-alert>
  <div v-if="buckets !== null">
    <vis-timeline :buckets="buckets" :showRowLabels="true" :queriedInterval="daterange" :swimlane="swimlane" :updateTimelineWindow="updateTimelineWindow"></vis-timeline>
    <aw-devonly reason="Not ready for production, still experimenting">
      <aw-calendar :buckets="buckets"></aw-calendar>
    </aw-devonly>
  </div>
  <div v-else>
    <h1 class="aw-loading">Loading...</h1>
  </div>
</div>
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';
import { useSettingsStore } from '~/features/settings/store/settings';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import { seconds_to_duration } from '~/app/lib/time';

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Timeline',
  data() {
    return {
      all_buckets: null as any,
      hosts: null as string[] | null,
      buckets: null as any[] | null,
      clients: null as string[] | null,
      daterange: null as [moment.Moment, moment.Moment] | null,
      maxDuration: 31 * 24 * 60 * 60,
      filter_hostname: null as string | null,
      filter_client: null as string | null,
      filter_duration: null as number | null,
      swimlane: null as string | null,
      updateTimelineWindow: true,
    };
  },
  computed: {
    timeintervalDefaultDuration() {
      const settingsStore = useSettingsStore();
      return Number(settingsStore.durationDefault);
    },
    num_events() {
      return _.sumBy(this.buckets || [], 'events.length');
    },
    filter_summary() {
      const desc: string[] = [];
      if (this.filter_hostname) desc.push(this.filter_hostname);
      if (this.filter_client) desc.push(this.filter_client);
      if (this.filter_duration! > 0) desc.push(seconds_to_duration(this.filter_duration!));
      return desc.length > 0 ? desc.join(', ') : 'none';
    },
  },
  watch: {
    daterange() {
      this.updateTimelineWindow = true;
      this.getBuckets();
    },
    filter_hostname() {
      this.updateTimelineWindow = false;
      this.getBuckets();
    },
    filter_client() {
      this.updateTimelineWindow = false;
      this.getBuckets();
    },
    filter_duration() {
      this.updateTimelineWindow = false;
      this.getBuckets();
    },
    swimlane() {
      this.updateTimelineWindow = false;
      this.getBuckets();
    },
  },
  created() {
    let query = window.location.search;
    if (!query) {
      const hash = window.location.hash;
      const idx = hash.indexOf('?');
      if (idx !== -1) {
        query = hash.slice(idx);
      }
    }
    const params = new URLSearchParams(query);
    const start = params.get('start');
    const end = params.get('end');
    if (start && end) {
      this.daterange = [moment(start), moment(end)];
    }
  },
  methods: {
    async getBuckets() {
      if (!this.daterange) return;
      this.all_buckets = Object.freeze(
        await useBucketsStore().getBucketsWithEvents({
          start: this.daterange[0].format(),
          end: this.daterange[1].format(),
        })
      );
      this.hosts = Array.from(new Set(this.all_buckets.map((b: any) => b.hostname)));
      this.clients = Array.from(new Set(this.all_buckets.map((b: any) => b.client)));
      let bs = this.all_buckets;
      if (this.filter_hostname) bs = bs.filter((b: any) => b.hostname === this.filter_hostname);
      if (this.filter_client) bs = bs.filter((b: any) => b.client === this.filter_client);
      if (this.filter_duration! > 0) {
        bs.forEach((b: any) => {
          b.events = b.events.filter((e: any) => e.duration >= this.filter_duration!);
        });
      }
      this.buckets = bs;
    },
  },
});
</script>
