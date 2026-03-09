<template>
<div class="space-y-4">
  <h3 class="aw-section-title">Search</h3>
  <aw-alert variant="warning" show>This feature is still in early development.</aw-alert>
  <aw-alert v-if="error" show variant="danger">{{error}}</aw-alert>
  <div class="aw-card flex flex-col gap-3 sm:flex-row sm:items-center">
    <ui-input class="aw-input h-11" v-model="pattern" type="text" placeholder="Regex pattern to search for" @keyup.enter="search()" />
    <ui-button class="aw-btn aw-btn-lg aw-btn-success" type="button" @click="search()">
      <icon name="search"></icon><span>Search</span>
    </ui-button>
  </div>
  <div class="flex items-center justify-between gap-3"><span class="text-sm text-foreground-muted">Hostname: {{queryOptions.hostname}}</span>
    <ui-button class="aw-btn aw-btn-md aw-btn-secondary" type="button" @click="show_options = !show_options"><span v-if="!show_options">
        <icon name="angle-double-down"></icon> Show options</span><span v-else>
        <icon name="angle-double-up"></icon> Hide options</span></ui-button>
  </div>
  <div class="aw-card-muted space-y-3" v-show="show_options">
    <h4 class="aw-subtitle">Options</h4>
    <aw-query-options v-model="queryOptions"></aw-query-options>
  </div>
  <div class="aw-card text-sm text-foreground" v-if="status == 'searching'">
    <div>
      <icon name="spinner" pulse></icon> Searching...
    </div>
  </div>
  <div class="space-y-4" v-if="events != null">
    <div class="aw-divider"></div>
    <aw-selectable-eventview :events="events"></aw-selectable-eventview>
    <div class="text-sm text-foreground">Didn't find what you were looking for?<br>Add a week to the search:
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary ml-2" type="button" @click="queryOptions.start = moment(queryOptions.start).subtract(1, 'week'); search()">+1 week</ui-button>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';
import { canonicalEvents } from '~/app/lib/queries';


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
