<template>
<div class="space-y-5">
  <h3 class="aw-section-title">Query Explorer</h3>
  <p class="aw-caption">See <ui-link class="aw-link" href="https://docs.activitywatch.net/en/latest/examples/querying-data.html">the documentation</ui-link> for help on how to write queries.</p>
  <div class="aw-divider"></div>
  <aw-alert v-if="error" variant="danger" show>{{error}}</aw-alert>
  <form class="aw-card space-y-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <label class="flex flex-col gap-1"><span class="aw-label">Start</span>
        <ui-input class="aw-input" type="date" :max="today" v-model="startdate" />
      </label>
      <label class="flex flex-col gap-1"><span class="aw-label">End</span>
        <ui-input class="aw-input" type="date" :max="tomorrow" v-model="enddate" />
      </label>
    </div>
    <label class="flex flex-col gap-1"><span class="aw-label">Query</span>
      <ui-textarea class="aw-textarea font-mono" v-model="query_code" @keypress.ctrl.enter="query()" rows="10"></ui-textarea>
    </label>
    <div class="flex items-center gap-3">
      <ui-button class="aw-btn aw-btn-md aw-btn-success" type="button" @click="query()">Query</ui-button><span class="text-foreground-muted text-sm">{{eventcount_str}}</span>
    </div>
  </form>
  <div class="aw-divider"></div>
  <aw-selectable-eventview :events="events" :event_type="event_type"></aw-selectable-eventview>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import moment from 'moment';
import _ from 'lodash';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { serializeQueryCategoryRules } from '~/features/categorization/lib/categoryRules';

const today = moment().startOf('day');
const tomorrow = moment(today).add(24, 'hours');

export default defineComponent({
  name: 'QueryExplorer',
  data() {
    // allow queries to be saved in a URL parameter
    let queryCode = this.$route.query.q;

    if (_.isEmpty(this.$route.query.q)) {
      queryCode = `
afk_events = query_bucket(find_bucket("aw-watcher-afk_"));
window_events = query_bucket(find_bucket("aw-watcher-window_"));
window_events = filter_period_intersect(window_events, filter_keyvals(afk_events, "status", ["not-afk"]));
merged_events = merge_events_by_keys(window_events, ["app", "title"]);
merged_events = categorize(merged_events, __CATEGORIES__);
RETURN = sort_by_duration(merged_events);
`.trim();
    }

    return {
      query_code: queryCode,
      event_type: 'currentwindow',
      events: [],
      today: today.format(),
      tomorrow: tomorrow.format(),
      error: '',
      startdate: today.format('YYYY-MM-DD'),
      enddate: tomorrow.format('YYYY-MM-DD'),
    };
  },
  computed: {
    eventcount_str: function () {
      if (Array.isArray(this.events)) return 'Number of events: ' + this.events.length;
      else return '';
    },
  },
  mounted: function () {
    useCategoryStore().load();
  },
  methods: {
    async query() {
      let query = this.query_code;

      // replace magic string `__CATEGORIES__` in query text with latest category rule
      if (_.includes(query, '__CATEGORIES__')) {
        const categoryRules = useCategoryStore().queryRules;

        if (useCategoryStore().queryRules.length === 0) {
          this.error = '__CATEGORIES__ was used in query but no categories have been defined yet.';
          return;
        }

        query = query.replace('__CATEGORIES__', serializeQueryCategoryRules(categoryRules));
      }

      // the aw-client expects an array of commands with whitespace cleaned up
      query = query.split(';').map(s => s.trim() + ';');
      const timeperiods = [moment(this.startdate).format() + '/' + moment(this.enddate).format()];

      try {
        const data = await this.$aw.query(timeperiods, query);
        this.events = data[0];
        this.error = '';
      } catch (e) {
        this.error = e.response.data.message;
      }
    },
  },
});
</script>
