<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <span class="aw-page-title">{{ customFormattedDate }}</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <ui-button
          class="aw-icon-button h-9 w-9"
          @click="refresh(true)"
          title="Refresh"
          type="button"
        >
          <icon class="h-4 w-4" name="sync"></icon>
        </ui-button>
        <div class="aw-segmented-control hidden md:inline-flex">
          <ui-button
            class="aw-segmented-item"
            v-for="(label, value) in periodLengths"
            :key="value"
            :class="periodLength === value ? 'aw-segmented-item-active' : ''"
            @click="setCurrentPeriod(value)"
            type="button"
            >{{ label.charAt(0).toUpperCase() + label.slice(1) }}</ui-button
          >
        </div>
        <date-navigator
          :model-value="_date"
          :max="latestDate"
          :disable-next="nextPeriod() > latestDate"
          @previous="$router.push(buildActivityRoute(previousPeriod()))"
          @next="$router.push(buildActivityRoute(nextPeriod()))"
          @select="setDate($event, periodLength)"
        ></date-navigator>
        <theme-toggle-button floating></theme-toggle-button>
      </div>
    </div>
    <div class="border-base flex flex-wrap items-center gap-2 border-b pb-2">
      <ui-link
        class="aw-tab-link"
        v-for="view in resolvedViews"
        :key="view.id"
        :to="{
          name: 'activity-view',
          params: { ...$route.params, view_id: view.id },
          query: $route.query,
        }"
        :class="currentView.id == view.id ? 'aw-tab-link-active' : ''"
        >{{ view.name }}</ui-link
      >
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <router-view class="h-full"></router-view>
      <aw-devonly>
        <ui-button class="aw-btn aw-btn-secondary" id="load-demo" @click="load_demo" type="button"
          >Load demo data</ui-button
        >
      </aw-devonly>
    </div>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import moment from 'moment';
import { get_day_start_with_offset, get_today_with_offset } from '~/app/lib/time';
import { periodLengthConvertMoment } from '~/app/lib/timeperiod';
import _ from 'lodash';
import DateNavigator from '~/shared/navigation/DateNavigator.vue';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';

import { useSettingsStore } from '~/features/settings/store/settings';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { useActivityStore, QueryOptions } from '~/features/activity/store/activity';
import { useActivityHighlightStore } from '~/features/activity/store/highlight';
import { defaultViews, useViewsStore } from '~/features/activity/store/views';

import { defineComponent } from 'vue';

const VALID_PERIOD_LENGTHS = ['day', 'week', 'month', 'year', 'last7d', 'last30d'];

function isValidPeriodLength(value: unknown): value is string {
  return typeof value === 'string' && VALID_PERIOD_LENGTHS.includes(value);
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && moment(value, 'YYYY-MM-DD', true).isValid();
}

export default defineComponent({
  name: 'Activity',
  components: {
    DateNavigator,
    ThemeToggleButton,
  },
  props: {
    host: String,
    date: {
      type: String,
      // NOTE: This does not work as you'd might expect since the default is set on
      // initialization, which would lead to the same date always being returned,
      // even if the day has changed.
      // Instead, use the computed _date.
      //default: get_today(),
    },
    periodLength: {
      type: String,
      default: 'day',
    },
  },
  data: function () {
    return {
      activityStore: useActivityStore(),
      categoryStore: useCategoryStore(),
      viewsStore: useViewsStore(),
      settingsStore: useSettingsStore(),
      highlightStore: useActivityHighlightStore(),

      isBootstrapping: true,

      include_audible: true,
      include_stopwatch: true,
      filter_afk: true,
    };
  },
  computed: {
    ...mapState(useViewsStore, ['views']),
    ...mapState(useSettingsStore, ['always_active_pattern']),

    // getter and setter for filter_category, getting and setting $route.query
    filter_category: {
      get() {
        if (!this.$route.query.category) return null;
        return this.$route.query.category.split('>');
      },
      set(value) {
        if (value == null) {
          this.$router.push({ query: _.omit(this.$route.query, 'category') });
        } else {
          this.$router.push({ query: { ...this.$route.query, category: value.join('>') } });
        }
      },
    },
    customFormattedDate: function () {
      const periodStart = moment(this.timeperiod.start);
      if (this.normalizedPeriodLength === 'day') {
        return periodStart.format('dddd, MMMM D, YYYY');
      } else if (this.normalizedPeriodLength === 'week') {
        return `Week ${periodStart.format('w')} - ${periodStart.format('MMMM D, YYYY')}`;
      } else if (this.normalizedPeriodLength === 'month') {
        return periodStart.format('MMMM YYYY');
      } else if (this.normalizedPeriodLength === 'year') {
        return periodStart.format('YYYY');
      }
      return `${periodStart.format('YYYY-MM-DD')} - ${moment(this.timeperiod.start)
        .add(...this.timeperiod.length)
        .format('YYYY-MM-DD')}`;
    },
    normalizedPeriodLength: function () {
      if (isValidPeriodLength(this.periodLength)) {
        return this.periodLength;
      }

      if (isValidPeriodLength(this.date)) {
        return this.date;
      }

      return 'day';
    },
    normalizedDate: function () {
      const offset = this.settingsStore.startOfDay;

      if (isValidDateString(this.date)) {
        return this.date;
      }

      if (isValidDateString(this.periodLength)) {
        return this.periodLength;
      }

      return get_today_with_offset(offset);
    },
    latestDate: function () {
      return get_today_with_offset(this.settingsStore.startOfDay);
    },

    periodLengths: function () {
      const periods: Record<string, string> = {
        day: 'day',
        week: 'week',
        month: 'month',
        year: 'year',
      };
      return periods;
    },
    resolvedViews: function () {
      return this.views && this.views.length > 0 ? this.views : defaultViews;
    },
    periodIsBrowseable: function () {
      return ['day', 'week', 'month', 'year'].includes(this.normalizedPeriodLength);
    },
    currentView: function () {
      return (
        this.resolvedViews.find(v => v.id == this.$route.params.view_id) || this.resolvedViews[0]
      );
    },
    currentViewId: function () {
      // If localStore is not yet initialized, then currentView can be undefined. In that case, we return an empty string (which should route to the default view)
      return this.currentView !== undefined ? this.currentView.id : '';
    },
    _date: function () {
      return this.normalizedDate;
    },
    subview: function () {
      return this.$route.meta.subview;
    },
    filter_categories: function () {
      if (this.filter_category) {
        const cats = this.categoryStore.all_categories;
        const isChild = p => c => c.length > p.length && _.isEqual(p, c.slice(0, p.length));
        const children = _.filter(cats, isChild(this.filter_category));
        return [this.filter_category].concat(children);
      } else {
        return null;
      }
    },
    periodusage: function () {
      return this.activityStore.getActiveHistoryAroundTimeperiod(this.timeperiod);
    },
    timeperiod: function () {
      const settingsStore = useSettingsStore();

      if (this.periodIsBrowseable) {
        return {
          start: get_day_start_with_offset(this._date, settingsStore.startOfDay),
          length: [1, this.normalizedPeriodLength || 'day'],
        };
      } else {
        const len = { last7d: [7, 'days'], last30d: [30, 'days'] }[this.normalizedPeriodLength] || [
          1,
          'day',
        ];
        return {
          start: get_day_start_with_offset(
            moment(this._date).subtract(len[0] - 1, len[1] as any),
            settingsStore.startOfDay
          ),
          length: len as [number, string],
        };
      }
    },
    periodReadableRange: function () {
      const periodStart = moment(this.timeperiod.start);
      const dateFormatString = 'YYYY-MM-DD';

      // it's helpful to render a range for the week as opposed to just the start of the week
      // or the number of the week so users can easily determine (a) if we are using monday/sunday as the week
      // start and exactly when the week ends. The formatting code ends up being a bit more wonky, but it's
      // worth the tradeoff. https://github.com/ActivityWatch/aw-webui/pull/284

      let periodLength;
      if (this.periodIsBrowseable) {
        periodLength = [1, this.normalizedPeriodLength];
      } else {
        if (this.normalizedPeriodLength === 'last7d') {
          periodLength = [7, 'day'];
        } else if (this.normalizedPeriodLength === 'last30d') {
          periodLength = [30, 'day'];
        } else {
          throw 'unknown periodLength';
        }
      }

      const startOfPeriod = periodStart.format(dateFormatString);
      const endOfPeriod = periodStart.add(...periodLength).format(dateFormatString);
      return `${startOfPeriod}—${endOfPeriod}`;
    },
  },
  watch: {
    host: function () {
      this.handleReactiveRefresh();
    },
    timeperiod: function () {
      this.handleReactiveRefresh();
    },
    filter_category: function () {
      this.handleReactiveRefresh();
    },
    filter_afk: function () {
      this.handleReactiveRefresh();
    },
    include_audible: function () {
      this.handleReactiveRefresh();
    },
    include_stopwatch: function () {
      this.handleReactiveRefresh();
    },
    currentViewId: function () {
      this.handleReactiveRefresh();
    },
  },

  mounted: async function () {
    try {
      await this.normalizeRouteIfNeeded();
    } catch (e) {
      console.error('Failed to normalize activity route', e);
    }

    try {
      await this.viewsStore.load();
    } catch (e) {
      console.error('Failed to load views', e);
      this.viewsStore.loadViews([...defaultViews]);
    }

    try {
      this.categoryStore.load();
    } catch (e) {
      console.error('Failed to load categories', e);
    }

    try {
      await this.refresh();
    } catch (e) {
      console.error('Failed to refresh activity view', e);
      if (e.message !== 'canceled') {
        throw e;
      }
    } finally {
      this.isBootstrapping = false;
    }
  },

  beforeUnmount: async function () {
    // Cancels pending requests and resets store
    this.highlightStore.clear();
    await this.activityStore.reset();
  },

  methods: {
    handleReactiveRefresh() {
      if (this.isBootstrapping) {
        return;
      }

      this.highlightStore.clear();
      this.refresh();
    },

    async normalizeRouteIfNeeded() {
      const expectedRoute = this.buildActivityRoute(
        this.normalizedDate,
        this.normalizedPeriodLength
      );
      const expectedFullPath = this.$router.resolve(expectedRoute).fullPath;

      if (this.$route.fullPath === expectedFullPath) {
        return false;
      }

      await this.$router.replace(expectedRoute);
      return true;
    },
    previousPeriod: function () {
      return moment(this._date)
        .subtract(
          this.timeperiod.length[0],
          this.timeperiod.length[1] as moment.unitOfTime.DurationConstructor
        )
        .format('YYYY-MM-DD');
    },
    nextPeriod: function () {
      return moment(this._date)
        .add(
          this.timeperiod.length[0],
          this.timeperiod.length[1] as moment.unitOfTime.DurationConstructor
        )
        .format('YYYY-MM-DD');
    },
    setCurrentPeriod(periodLength: string) {
      this.setDate(this.latestDate, periodLength);
    },

    setDate: function (date, periodLength) {
      // periodLength is an optional argument, default to this.periodLength
      if (!periodLength) {
        periodLength = this.normalizedPeriodLength;
      }

      const momentJsDate = moment(date);
      if (!momentJsDate.isValid()) {
        return;
      }

      let new_date;
      if (periodLength == '7 days') {
        periodLength = 'last7d';
        new_date = momentJsDate.add(1, 'days').format('YYYY-MM-DD');
      } else if (periodLength == '30 days') {
        periodLength = 'last30d';
        new_date = momentJsDate.add(1, 'days').format('YYYY-MM-DD');
      } else {
        const new_period_length_moment = periodLengthConvertMoment(periodLength);
        new_date = momentJsDate.startOf(new_period_length_moment).format('YYYY-MM-DD');
      }
      const route = this.buildActivityRoute(new_date, periodLength);
      if (this.$route.fullPath !== this.$router.resolve(route).fullPath) {
        this.$router.push(route);
      }
    },
    buildActivityRoute(date, periodLength = this.normalizedPeriodLength) {
      const params = {
        host: this.host,
        periodLength,
        date,
        subview: this.subview || 'view',
      } as Record<string, string>;

      const requestedViewId = this.$route.params.view_id as string;
      const hasRequestedView = this.resolvedViews.some(view => view.id === requestedViewId);
      const activeViewId = hasRequestedView ? requestedViewId : this.currentViewId;
      if (activeViewId) {
        params.view_id = activeViewId;
      }

      return {
        name: 'activity-view',
        params,
        query: this.$route.query,
      };
    },

    refresh: async function (force) {
      if (force) {
        this.highlightStore.clear();
      }
      // Decode the host param to support comma-separated multi-host querying
      const decodedHost = decodeURIComponent(this.host);
      const queryOptions: QueryOptions = {
        timeperiod: this.timeperiod,
        host: decodedHost,
        force: force,
        filter_afk: this.filter_afk,
        include_audible: this.include_audible,
        include_stopwatch: this.include_stopwatch,
        filter_categories: this.filter_categories,
        dont_query_inactive: this.filter_afk,
        always_active_pattern: this.always_active_pattern,
        requested_visualizations: this.currentView?.elements?.map(el => el.type) || [],
      };
      try {
        await this.activityStore.ensure_loaded(queryOptions);
      } catch (error) {
        if (this.activityStore.isAbortError(error)) {
          return;
        }
        throw error;
      }
    },

    load_demo: async function () {
      await this.activityStore.load_demo();
    },
  },
});
</script>
