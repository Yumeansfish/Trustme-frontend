<template lang="pug">
div.mx-3.space-y-3
  div.grid.gap-3.rounded-xl.border.border-slate-200.bg-white.p-4.shadow-sm(class="md:grid-cols-3")
    label.flex.flex-col.gap-1.text-sm.font-medium.text-slate-700
      span Bucket
      select.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
        v-model="selectedBucket"
        class="focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
      )
        option(v-for="bucket in buckets", :key="bucket.id", :value="bucket.id") {{ bucket.id }}

    label.flex.flex-col.gap-1.text-sm.font-medium.text-slate-700
      span Show
      select.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
        v-model="view"
        class="focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
      )
        option(value="timeGridDay") Day
        option(value="timeGridWeek") Week

    label.flex.items-center.gap-2.self-end.text-sm.text-slate-700
      input.h-4.w-4.rounded.border-slate-300.text-violet-600(type="checkbox" v-model="fitToActive" class="focus:ring-violet-400")
      span Fit to active

  FullCalendar(ref="fullCalendar", :options="calendarOptions")
</template>

<script>
import '@fullcalendar/core';
import FullCalendar from '@fullcalendar/vue3';
import timeGridPlugin from '@fullcalendar/timegrid';
import { getTitleAttr, getColorFromString } from '../util/color';
import moment from 'moment';
import _ from 'lodash';
import { useToast } from '~/composables/useToast';

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
