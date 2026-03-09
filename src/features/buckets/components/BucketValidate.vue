<template>
<div class="space-y-4">
  <h3 class="aw-subtitle">Validate buckets</h3>
  <p class="aw-caption">This is a small tool to check the validity of your buckets and their events.</p>
  <div class="space-y-2">
    <h4 class="text-foreground-strong text-sm font-semibold">Bucket</h4>
    <ui-select class="aw-select" v-model="bucket" :disabled="buckets.length === 0">
      <option v-for="bucketOption in buckets" :key="bucketOption.value" :value="bucketOption.value">{{ bucketOption.text }}</option>
    </ui-select>
    <p class="aw-caption">Select the bucket to validate.</p>
    <p class="aw-caption" v-if="events !== null">Events: {{ events.length }}</p>
  </div>
  <div v-if="duplicateEvents !== null">
    <ui-collapsible summary-class="text-foreground-strong flex cursor-pointer items-center gap-2 text-sm font-medium" content-class="text-foreground space-y-2 p-2 text-sm">
      <template #summary>
        <icon class="text-success" name="check" v-if="duplicateEvents.length === 0"></icon>
        <icon class="text-warning" name="exclamation-triangle" v-else></icon>
        Duplicates: {{ duplicateEvents.length }}
      </template>
      <div>
        <p v-if="duplicateEvents.length === 0">No duplicate events found.</p>
        <template v-else>
          <p>The following {{ duplicateEvents.length }} duplicates were found.</p>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li v-for="overlap in duplicateEvents">{{ overlap[0].start.toISOString() }} - (id: {{ overlap[0].event.id }} & {{ overlap[1].event.id }}): {{ JSON.stringify(overlap[0].data) }}</li>
          </ul>
        </template>
      </div>
    </ui-collapsible>
  </div>
  <div v-if="overlappingEvents !== null">
    <ui-collapsible summary-class="text-foreground-strong flex cursor-pointer items-center gap-2 text-sm font-medium" content-class="text-foreground space-y-2 p-2 text-sm">
      <template #summary>
        <icon class="text-success" name="check" v-if="overlappingEvents.length === 0"></icon>
        <icon class="text-warning" name="exclamation-triangle" v-else></icon>
        Overlaps: {{ overlappingEvents.length }}x with a total duration of {{ friendlyduration(overlapDuration / 1000 ) }}
      </template>
      <div>
        <p v-if="overlappingEvents.length === 0">No overlapping events found.</p>
        <template v-else>
          <p>The following {{ overlappingEvents.length }} overlaps were found.</p>
          <p v-if="overlapDurationSameData > 0">Of these, {{ friendlyduration(overlapDurationSameData / 1000 ) }} are overlaps where the data is the same. These events could potentially be merged.</p>
          <div class="mt-2" v-for="event in overlappingEvents">
            <ul class="list-disc space-y-1 pl-5">
              <li>{{ event[0].start.toISOString() }}/{{ event[0].end.toISOString() }} - (id: {{ event[0].event.id }}): {{ JSON.stringify(event[0].event.data) }}</li>
              <li>{{ event[1].start.toISOString() }}/{{ event[1].end.toISOString() }} - (id: {{ event[1].event.id }}): {{ JSON.stringify(event[1].event.data) }}</li>
            </ul>
          </div>
        </template>
      </div>
    </ui-collapsible>
  </div>
  <div v-if="zeroDurationEvents !== null">
    <ui-collapsible summary-class="text-foreground-strong flex cursor-pointer items-center gap-2 text-sm font-medium" content-class="text-foreground space-y-2 p-2 text-sm">
      <template #summary>
        <icon class="text-success" name="check" v-if="zeroDurationEvents.length === 0"></icon>
        <icon class="text-info" name="info-circle" v-else></icon>
        Zero-duration events: {{ zeroDurationEvents.length }}
      </template>
      <div>
        <p v-if="zeroDurationEvents.length === 0">No zero-duration events found.</p>
        <template v-else>
          <p>The following {{ zeroDurationEvents.length }} zero-duration events were found:</p>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li v-for="event in zeroDurationEvents">{{ event.timestamp.toISOString() }}/{{ new Date(new Date(event.timestamp).valueOf() + 1000 * event.duration).toISOString() }} - (id: {{ event.id }}): {{ JSON.stringify(event.data) }}</li>
          </ul>
        </template>
      </div>
    </ui-collapsible>
  </div>
</div>
</template>

<script lang="ts">
import { getClient } from '~/app/lib/awclient';
import { overlappingEvents } from '~/shared/lib/transforms';
import _ from 'lodash';

export default {
  name: 'aw-bucket-merge',
  data() {
    return {
      buckets: [],
      bucket: null,
      events: null,
    };
  },
  computed: {
    validate() {
      const set = this.bucket !== null;
      const not_overlapping =
        this.overlappingEvents !== null && this.overlappingEvents.length === 0;
      return set && not_overlapping;
    },
    duplicateEvents() {
      if (this.overlappingEvents === null) {
        return null;
      }
      return this.overlappingEvents.filter(overlap => {
        if (
          _.isEqual(overlap[0].start, overlap[1].start) &&
          _.isEqual(overlap[0].end, overlap[1].end) &&
          _.isEqual(overlap[0].event.data, overlap[1].event.data)
        ) {
          return true;
        }
      });
    },
    overlappingEvents() {
      if (this.events === null) {
        return null;
      }
      return overlappingEvents(this.events, this.events);
    },
    overlapDuration() {
      // The total amount of overlapping time
      if (this.overlappingEvents === null) {
        return null;
      }
      return this.overlappingEvents.reduce((acc, event) => {
        const start = event[0].start > event[1].start ? event[0].start : event[1].start;
        const end = event[0].end < event[1].end ? event[0].end : event[1].end;
        return acc + (end - start);
      }, 0);
    },
    overlapDurationSameData() {
      // like overlapDuration, but only count overlaps where the data is the same
      // These events could be merged safely (assuming they have no other overlaps)
      if (this.overlappingEvents === null) {
        return null;
      }
      return this.overlappingEvents.reduce((acc, event) => {
        if (!_.isEqual(event[0].event.data, event[1].event.data)) {
          return acc;
        }
        const start = event[0].start > event[1].start ? event[0].start : event[1].start;
        const end = event[0].end < event[1].end ? event[0].end : event[1].end;
        return acc + (end - start);
      }, 0);
    },
    zeroDurationEvents() {
      if (this.events === null) {
        return null;
      }
      return this.events.filter(event => event.duration === 0);
    },
  },
  watch: {
    bucket: async function (new_bucket_id) {
      this.events = null;
      this.events = await this.getEvents(new_bucket_id);
    },
  },
  mounted() {
    this.getBuckets();
  },
  methods: {
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
