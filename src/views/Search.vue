<template lang="pug">
div.space-y-4
  h3.text-2xl.font-semibold.text-slate-900 Search

  b-alert(style="warning" show)
    | This feature is still in early development.

  b-alert(v-if="error" show variant="danger")
    | {{error}}

  div.flex.flex-col.gap-3.rounded-xl.border.border-slate-200.bg-white.p-4.shadow-sm(class="sm:flex-row sm:items-center")
    input.h-11.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
      v-model="pattern"
      type="text"
      placeholder="Regex pattern to search for"
      class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      @keyup.enter="search()"
    )
    button.inline-flex.h-11.items-center.justify-center.gap-2.rounded-md.border.border-emerald-600.bg-emerald-600.px-4.text-sm.font-medium.text-white.transition(
      type="button"
      @click="search()"
      class="hover:bg-emerald-700"
    )
      icon(name="search")
      span Search

  div.flex.items-center.justify-between.gap-3
    span.text-sm.text-slate-500 Hostname: {{queryOptions.hostname}}
    button.inline-flex.h-9.items-center.justify-center.gap-2.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.font-medium.text-slate-700.transition(
      type="button"
      @click="show_options = !show_options"
      class="hover:bg-slate-100"
    )
      span(v-if="!show_options")
        | #[icon(name="angle-double-down")] Show options
      span(v-else)
        | #[icon(name="angle-double-up")] Hide options

  div.space-y-3.rounded-xl.border.border-slate-200.bg-slate-50.p-4(v-show="show_options")
    h4.text-lg.font-semibold.text-slate-900 Options
    aw-query-options(v-model="queryOptions")

  div.rounded-xl.border.border-slate-200.bg-white.p-4.text-sm.text-slate-600(v-if="status == 'searching'")
    div #[icon(name="spinner" pulse)] Searching...

  div.space-y-4(v-if="events != null")
    div.h-px.bg-slate-200

    aw-selectable-eventview(:events="events")

    div.text-sm.text-slate-600
      | Didn't find what you were looking for?
      br
      | Add a week to the search:
      button.ml-2.inline-flex.h-8.items-center.justify-center.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.font-medium.text-slate-700.transition(
        type="button"
        @click="queryOptions.start = moment(queryOptions.start).subtract(1, 'week'); search()"
        class="hover:bg-slate-100"
      ) +1 week
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';
import { canonicalEvents } from '~/queries';


export default {
  name: 'Search',
  data() {
    return {
      pattern: '',
      events: null,

      status: null,
      error: '',

      // Options
      show_options: false,
      queryOptions: {
        start: moment().subtract(1, 'day'),
        stop: moment().add(1, 'day'),
      },
    };
  },
  methods: {
    search: async function () {
      let query = canonicalEvents({
        bid_window: 'aw-watcher-window_' + this.queryOptions.hostname,
        bid_afk: 'aw-watcher-afk_' + this.queryOptions.hostname,
        filter_afk: this.queryOptions.filter_afk,
        categories: [[['searched'], { type: 'regex', regex: this.pattern }]],
        filter_categories: [['searched']],
      });
      query += '; RETURN = events;';

      const query_array = query.split(';').map(s => s.trim() + ';');
      const timeperiods = [
        moment(this.queryOptions.start).format() + '/' + moment(this.queryOptions.stop).format(),
      ];
      try {
        this.status = 'searching';
        const data = await this.$aw.query(timeperiods, query_array);
        this.events = _.orderBy(data[0], ['timestamp'], ['desc']);
        this.error = '';
      } catch (e) {
        console.error(e);
        this.error = e.response.data.message;
      } finally {
        this.status = null;
      }
    },
  },
};
</script>
