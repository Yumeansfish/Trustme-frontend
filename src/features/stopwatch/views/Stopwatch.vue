<template>
<div class="space-y-5">
  <div class="space-y-1">
    <h2 class="aw-section-title">Stopwatch</h2>
    <p class="text-sm text-foreground-muted">Using bucket: {{bucket_id}}</p>
  </div>
  <aw-alert show>This is an early experiment. Data entered here is not shown in the Activity view, yet.</aw-alert>
  <div class="aw-card flex flex-col gap-3 sm:flex-row sm:items-center">
    <ui-input class="aw-input h-11" v-model="label" type="text" placeholder="What are you working on?" @keyup.enter="startTimer(label)" />
    <ui-button class="aw-btn aw-btn-lg aw-btn-success" type="button" @click="startTimer(label)">
      <icon name="play"></icon><span>Start</span>
    </ui-button>
  </div>
  <div class="aw-divider"></div>
  <div class="aw-card p-5" v-if="loading"><span class="text-sm text-foreground-muted">Loading...</span></div>
  <div class="space-y-6" v-else>
    <div class="space-y-3">
      <h3 class="aw-subtitle text-xl">Running</h3>
      <div v-if="runningTimers.length > 0">
        <div v-for="e in runningTimers" :key="e.id">
          <stopwatch-entry :event="e" :bucket_id="bucket_id" :now="now" @delete="removeTimer" @update="updateTimer"></stopwatch-entry>
          <div class="aw-divider"></div>
        </div>
      </div>
      <div v-else><span class="text-sm text-foreground-muted">No stopwatch running</span>
        <div class="aw-divider"></div>
      </div>
      <div class="space-y-3" v-if="stoppedTimers.length > 0">
        <h3 class="aw-subtitle text-xl">History</h3>
        <div v-for="k in Object.keys(timersByDate).sort().reverse()">
          <h5 class="aw-eyebrow mb-1 mt-2">{{ k }}</h5>
          <div v-for="e in timersByDate[k]" :key="e.id">
            <stopwatch-entry :event="e" :bucket_id="bucket_id" :now="now" @delete="removeTimer" @update="updateTimer" @new="startTimer(e.data.label)"></stopwatch-entry>
            <div class="aw-divider"></div>
          </div>
        </div>
      </div>
      <div v-else><span class="text-sm text-foreground-muted">No history to show</span>
        <div class="aw-divider"></div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';

import StopwatchEntry from '../components/StopwatchEntry.vue';

export default {
  name: 'Stopwatch',
  components: {
    'stopwatch-entry': StopwatchEntry,
  },
  data: () => {
    return {
      loading: true,
      bucket_id: 'aw-stopwatch',
      events: [],
      label: '',
      now: moment(),
    };
  },
  computed: {
    runningTimers() {
      return _.filter(this.events, e => e.data.running);
    },
    stoppedTimers() {
      return _.filter(this.events, e => !e.data.running);
    },
    timersByDate() {
      return _.groupBy(this.stoppedTimers, e => moment(e.timestamp).format('YYYY-MM-DD'));
    },
  },
  mounted: async function () {
    // TODO: List all possible timer buckets
    //this.getBuckets();

    // Create default timer bucket
    await this.$aw.ensureBucket(this.bucket_id, 'general.stopwatch', 'unknown');

    // TODO: Get all timer events
    await this.getEvents();

    setInterval(() => (this.now = moment()), 1000);
  },
  methods: {
    startTimer: async function (label) {
      const event = {
        timestamp: new Date(),
        data: {
          running: true,
          label: label,
        },
      };
      await this.$aw.heartbeat(this.bucket_id, 1, event);
      await this.getEvents();
    },

    updateTimer: async function (new_event) {
      const i = this.events.findIndex(e => e.id == new_event.id);
      if (i != -1) {
        // This is needed instead of this.events[i] because insides of arrays
        // are not reactive in Vue
        this.$set(this.events, i, new_event);
      } else {
        console.error(':(');
      }
    },

    removeTimer: function (event) {
      this.events = _.filter(this.events, e => e.id != event.id);
    },

    getEvents: async function () {
      this.events = await this.$aw.getEvents(this.bucket_id, { limit: 100 });
      this.loading = false;
    },
  },
};
</script>
