<template>
<div class="space-y-4">
  <h3 class="aw-subtitle">Merge buckets</h3>
  <p class="aw-caption">
    Sometimes, you might want to merge the events of two buckets together into one.
    This is commonly useful to address the case where your hostname might have changed,
    creating two buckets for the same watcher and host, which you want to combine together again.
  </p>
  <div class="grid gap-4 md:grid-cols-2">
    <div class="space-y-2">
      <h4 class="text-foreground-strong text-sm font-semibold">Bucket from</h4>
      <ui-select class="aw-select" v-model="bucket_from" :disabled="buckets.length === 0">
        <option v-for="bucket in buckets" :key="bucket.value" :value="bucket.value">{{ bucket.text }}</option>
      </ui-select>
      <p class="aw-caption">
        Select the bucket from which you want to merge the events.
        This bucket will be deleted after the merge.
      </p>
      <p class="aw-caption" v-if="events_from !== null">Events: {{ events_from.length }}</p>
    </div>
    <div class="space-y-2">
      <h4 class="text-foreground-strong text-sm font-semibold">Bucket to</h4>
      <ui-select class="aw-select" v-model="bucket_to" :disabled="buckets.length === 0">
        <option v-for="bucket in buckets" :key="bucket.value" :value="bucket.value">{{ bucket.text }}</option>
      </ui-select>
      <p class="aw-caption">
        Select the bucket to which you want to merge the events.
        This bucket will remain after the merge.
      </p>
      <p class="aw-caption" v-if="events_to !== null">Events: {{ events_to.length }}</p>
    </div>
  </div>
  <div class="aw-card-muted space-y-3" v-if="overlappingEvents !== null && overlappingEvents.length > 0">
    <h3 class="aw-subtitle">Overlapping events</h3>
    <div class="text-foreground space-y-2 text-sm">
      <p>The following {{ overlappingEvents.length }} events are overlapping:</p>
      <ul class="list-disc space-y-1 pl-5">
        <li v-for="event in overlappingEvents">
          {{ event[0].start }} - {{ event[0].end }} ({{ event[0].event.id }})
          overlaps with
          {{ event[1].start }} - {{ event[1].end }} ({{ event[1].event.id }})
        </li>
      </ul>
    </div>
  </div>
  <ui-button class="aw-btn aw-btn-md aw-btn-success" type="button" :disabled="!validate" @click="merge()">Merge</ui-button>
</div>
</template>

<script lang="ts">
import { getClient } from '~/app/lib/awclient';
import { overlappingEvents } from '~/shared/lib/transforms';

export default {
  name: 'aw-bucket-merge',
  data() {
    return {
      buckets: [],
      bucket_from: null,
      bucket_to: null,
      events_from: null,
      events_to: null,
    };
  },
  computed: {
    validate() {
      const set = this.bucket_from !== null && this.bucket_to !== null;
      const not_same = this.bucket_from !== this.bucket_to;
      const not_overlapping =
        this.overlappingEvents !== null && this.overlappingEvents.length === 0;
      return set && not_same && not_overlapping;
    },
    overlappingEvents() {
      if (this.events_from === null || this.events_to === null) {
        return null;
      }
      return overlappingEvents(this.events_from, this.events_to);
    },
  },
  watch: {
    bucket_from: async function (new_bucket_id) {
      this.events_from = await this.getEvents(new_bucket_id);
    },
    bucket_to: async function (new_bucket_id) {
      this.events_to = await this.getEvents(new_bucket_id);
    },
  },
  mounted() {
    this.getBuckets();
  },
  methods: {
    merge: async function () {
      const client = getClient();
      const events = this.events_from;
      const bucket_id = this.bucket_to;
      const result = await client.insertEvents(bucket_id, events);
      console.log('result', result);
    },
    getBuckets: async function () {
      const client = getClient();
      const buckets = await client.getBuckets();
      this.buckets = Object.keys(buckets).map(bucket_id => {
        return { value: bucket_id, text: bucket_id };
      });
    },
    getEvents: async function (bucket_id) {
      const client = getClient();
      return await client.getEvents(bucket_id);
    },
  },
};
</script>
