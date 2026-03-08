<template>
<div class="space-y-4">
  <div>
    <select class="aw-select-sm max-w-xs" v-model="vis_method">
      <option value="eventlist">Event List</option>
      <option value="timeline">Timeline</option>
      <option value="summary">Summary</option>
      <option value="raw">Raw JSON</option>
    </select>
  </div>
  <div v-if="vis_method == 'timeline'">
    <vis-timeline :buckets="[{'id': 'search', 'type': 'search', 'events': events}]"></vis-timeline>
  </div>
  <div v-if="vis_method == 'eventlist'">
    <aw-eventlist :events="events"></aw-eventlist>
  </div>
  <div v-if="vis_method == 'summary'">
    <input class="aw-input mb-4" type="text" v-model.lazy.trim="summaryKey" placeholder="data key">
    <aw-summary :fields="events" :colorfunc="colorfunc" :namefunc="namefunc"></aw-summary>
  </div>
  <div v-if="vis_method == 'raw'">
    <pre class="aw-code-block">{{ events }}</pre>
  </div>
</div>
</template>

<script lang="ts">
export default {
  name: 'aw-selectable-eventview',
  props: {
    events: Array,
    event_type: { type: String, default: 'currentwindow' },
  },
  data: function () {
    return {
      vis_method: 'eventlist',

      /* Summary props */
      summaryKey: 'title',
      colorfunc: null,
      namefunc: null,
    };
  },
  mounted: async function () {
    this.colorfunc = this.summaryKeyFunc;
    this.namefunc = this.summaryKeyFunc;
  },
  methods: {
    summaryKeyFunc: function (e) {
      return e.data[this.summaryKey];
    },
  },
};
</script>
