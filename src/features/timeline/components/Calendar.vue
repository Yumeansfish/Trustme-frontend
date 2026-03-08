<template>
<div class="mx-3 space-y-3">
  <div class="aw-card grid gap-3 md:grid-cols-3">
    <label class="flex flex-col gap-1"><span class="aw-label">Bucket</span>
      <select class="aw-select" v-model="selectedBucket">
        <option v-for="bucket in buckets" :key="bucket.id" :value="bucket.id">{{ bucket.id }}</option>
      </select>
    </label>
    <label class="flex flex-col gap-1"><span class="aw-label">Show</span>
      <select class="aw-select" v-model="view">
        <option value="timeGridDay">Day</option>
        <option value="timeGridWeek">Week</option>
      </select>
    </label>
    <label class="flex items-center gap-2 self-end text-sm text-foreground">
      <input class="aw-checkbox" type="checkbox" v-model="fitToActive"><span>Fit to active</span>
    </label>
  </div>
  <FullCalendar ref="fullCalendar" :options="calendarOptions"></FullCalendar>
</div>
</template>

<script>
import '@fullcalendar/core';
import FullCalendar from '@fullcalendar/vue3';
import timeGridPlugin from '@fullcalendar/timegrid';
import { getTitleAttr, getColorFromString } from '~/features/categorization/lib/color';
import moment from 'moment';
import _ from 'lodash';
import { useToast } from '~/shared/composables/useToast';

// TODO: Use canonical timeline query, with flooding and categorization
// TODO: Checkbox for toggling category-view, where adjacent events with same category are merged and the events are labeled by category
// TODO: Use the recommended way of dynamically getting events: https://fullcalendar.io/docs/events-function
export default {
  components: {
    FullCalendar, // make the <FullCalendar> tag available
  },
  props: {
    buckets: { type: Array },
  },
  data() {
    return { fitToActive: false, selectedBucket: null, view: 'timeGridDay' };
  },
  computed: {
    calendarOptions: function () {
      const events = this.events;
      const first = _.minBy(events, e => e.start);
      const last = _.maxBy(events, e => e.end);
      // FIXME: end must be at least one slot (1 hour) after start, otherwise it fails hard
      let start, end;
      if (this.fitToActive && events.length > 0) {
        console.log(first.start);
        start = moment(first.start).startOf('hour').format().slice(11, 16);
        end = moment(last.end).endOf('hour').format().slice(11, 16);
      } else {
        start = '00:00:00';
        end = '24:00:00';
      }
      return {
        plugins: [timeGridPlugin],
        initialView: this.view,
        eventClick: this.onEventClick,
        events: events,
        allDaySlot: false,
        slotMinTime: start,
        slotMaxTime: end,
        nowIndicator: true,
        expandRows: true,
        slotLabelFormat: {
          hour: '2-digit',
          minute: '2-digit',
          //second: '2-digit',
          hour12: false,
        },
      };
    },
    events: function () {
      // NOTE: This returns FullCalendar events, not ActivityWatch events.
      if (this.buckets == null) return [];

      const bucket = _.find(this.buckets, b => b.id == this.selectedBucket);
      if (bucket == null) {
        return;
      }
      let events = bucket.events;
      events = _.filter(events, e => e.duration > 10);
      events = _.map(events, e => {
        return {
          title: getTitleAttr(bucket, e),
          start: moment(e.timestamp).format(),
          end: moment(e.timestamp).add(e.duration, 'seconds').format(),
          backgroundColor: getColorFromString(getTitleAttr(bucket, e)),
        };
      });
      return events;
    },
  },
  watch: {
    view: function (to) {
      const calendar = this.$refs.fullCalendar.getApi();
      calendar.changeView(to);
    },
  },
  methods: {
    onEventClick: function (arg) {
      const { info } = useToast();
      const startTime = arg.event?.start ? moment(arg.event.start).format('YYYY-MM-DD HH:mm') : 'unknown start';
      const endTime = arg.event?.end ? moment(arg.event.end).format('YYYY-MM-DD HH:mm') : 'unknown end';
      const title = arg.event?.title || 'Untitled';

      info('Event selected', `${title} · ${startTime} → ${endTime}`);
    },
  },
};
</script>
