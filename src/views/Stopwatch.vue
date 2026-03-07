<template lang="pug">
div.space-y-5
  div.space-y-1
    h2.text-2xl.font-semibold.text-slate-900 Stopwatch
    p.text-sm.text-slate-500
      | Using bucket: {{bucket_id}}

  b-alert(show)
    | This is an early experiment. Data entered here is not shown in the Activity view, yet.

  div.flex.flex-col.gap-3.rounded-xl.border.border-slate-200.bg-white.p-4.shadow-sm(class="sm:flex-row sm:items-center")
    input.h-11.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
      v-model="label"
      type="text"
      placeholder="What are you working on?"
      class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      @keyup.enter="startTimer(label)"
    )
    button.inline-flex.h-11.items-center.justify-center.gap-2.rounded-md.border.border-emerald-600.bg-emerald-600.px-4.text-sm.font-medium.text-white.transition(
      type="button"
      @click="startTimer(label)"
      class="hover:bg-emerald-700"
    )
      icon(name="play")
      span Start

  div.h-px.bg-slate-200

  div.rounded-xl.border.border-slate-200.bg-white.p-5.shadow-sm(v-if="loading")
    span.text-sm.text-slate-500 Loading...
  div.space-y-6(v-else)
    div.space-y-3
      h3.text-xl.font-semibold.text-slate-900 Running
      div(v-if="runningTimers.length > 0")
        div(v-for="e in runningTimers" :key="e.id")
          stopwatch-entry(:event="e", :bucket_id="bucket_id", :now="now",
            @delete="removeTimer", @update="updateTimer")
          hr(style="margin: 0")
      div(v-else)
        span.text-sm.text-slate-500 No stopwatch running
        hr

      div.space-y-3(v-if="stoppedTimers.length > 0")
        h3.text-xl.font-semibold.text-slate-900 History
        div(v-for="k in Object.keys(timersByDate).sort().reverse()")
          h5.mb-1.mt-2.text-sm.font-semibold.uppercase.text-slate-500(class="tracking-[0.18em]") {{ k }}
          div(v-for="e in timersByDate[k]" :key="e.id")
            stopwatch-entry(:event="e", :bucket_id="bucket_id", :now="now",
              @delete="removeTimer", @update="updateTimer", @new="startTimer(e.data.label)")
            hr(style="margin: 0")
      div(v-else)
        span.text-sm.text-slate-500 No history to show
        hr
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
