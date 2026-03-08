<template>
<div class="space-y-4">
  <div class="mt-3 mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div>
      <span class="aw-page-title">{{ customFormattedDate }}</span>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <button class="aw-icon-button h-9 w-9" @click="refresh(true)" title="Refresh" type="button">
        <icon class="h-4 w-4" name="sync"></icon>
      </button>
      <div class="aw-segmented-control hidden md:inline-flex">
        <button class="aw-segmented-item" v-for="(label, value) in periodLengths" :key="value" :class="periodLength === value ? 'aw-segmented-item-active' : ''" @click="setDate(_date, value)" type="button">{{ label.charAt(0).toUpperCase() + label.slice(1) }}</button>
      </div>
      <div class="aw-pill-control">
        <router-link :to="buildActivityRoute(previousPeriod())" custom v-slot="{ navigate, href }">
          <button class="aw-icon-button h-7 w-7 rounded-full" @click="navigate" :href="href" type="button">
            <icon class="h-3 w-3" name="chevron-left"></icon>
          </button>
        </router-link>
        <label class="text-foreground-muted hover:text-foreground-strong relative inline-flex h-7 w-9 cursor-pointer items-center justify-center transition">
          <icon class="h-3.5 w-3.5" name="calendar"></icon>
          <input class="absolute inset-0 cursor-pointer opacity-0" type="date" :value="_date" :max="today" @change="setDate($event.target.value, periodLength)">
        </label>
        <router-link :to="buildActivityRoute(nextPeriod())" custom v-slot="{ navigate, href }">
          <button class="aw-icon-button h-7 w-7 rounded-full disabled:cursor-not-allowed disabled:opacity-40" @click="navigate" :href="href" :disabled="nextPeriod() > today" type="button">
            <icon class="h-3 w-3" name="chevron-right"></icon>
          </button>
        </router-link>
      </div>
      <button class="aw-icon-button relative h-9 w-9" :class="showOptions ? 'bg-primary-soft text-primary' : ''" @click="showOptions = !showOptions" title="Filters" type="button">
        <icon class="h-4 w-4" name="filter"></icon>
        <span class="aw-count-badge" v-if="filters_set > 0">{{ filters_set }}</span>
      </button>
    </div>
  </div>
  <div class="aw-card-muted space-y-4" v-if="showOptions">
    <h5 class="text-foreground-strong text-sm font-semibold">Filters</h5>
    <div class="grid gap-4 lg:grid-cols-2">
      <div class="space-y-3">
        <label class="aw-filter-tile">
          <input class="aw-checkbox mt-0.5" v-model="filter_afk" type="checkbox">
          <span class="flex-1">
            <span class="font-medium">Exclude AFK time</span>
            <span class="text-foreground-subtle ml-2 inline-flex" title="Filter away time where the AFK watcher didn't detect any input.">
              <icon class="h-3.5 w-3.5" name="question-circle"></icon>
            </span>
          </span>
        </label>
        <label class="aw-filter-tile">
          <input class="aw-checkbox mt-0.5" v-model="include_audible" :disabled="!filter_afk" type="checkbox">
          <span class="flex-1">
            <span class="font-medium">Count audible browser tab as active</span>
            <span class="text-foreground-subtle ml-2 inline-flex" title="If the active window is an audible browser tab, count as active. Requires a browser watcher.">
              <icon class="h-3.5 w-3.5" name="question-circle"></icon>
            </span>
          </span>
        </label>
        <label class="aw-filter-tile" v-if="devmode">
          <input class="aw-checkbox mt-0.5" v-model="include_stopwatch" type="checkbox">
          <span class="flex-1">
            <span class="font-medium">Include manually logged events (stopwatch)</span>
            <span class="aw-filter-tile-note"><span class="font-semibold">Note:</span> WIP. Stopwatch events shadow other events when overlapping with them. Only shown in devmode.</span>
          </span>
        </label>
      </div>
      <label class="aw-label flex flex-col gap-1">
        <span>Show category</span>
        <select class="aw-select-sm" v-model="filter_category">
          <option :value="null">All categories</option>
          <option v-for="category in categoryStore.category_select(true)" :key="Array.isArray(category.value) ? category.value.join('>') : String(category.value)" :value="category.value">{{ category.text }}</option>
        </select>
      </label>
    </div>
  </div>
  <div class="border-base flex flex-wrap items-center gap-2 border-b pb-2">
    <router-link class="aw-tab-link" v-for="view in views" :key="view.id" :to="{ name: 'activity-view', params: {...$route.params, view_id: view.id}, query: $route.query}" :class="currentView.id == view.id ? 'aw-tab-link-active' : ''">{{ view.name }}</router-link>
    <button class="aw-btn aw-btn-md aw-btn-secondary ml-auto" type="button" @click="openNewViewModal">
      <icon class="h-4 w-4" name="plus"></icon>
      <span class="hidden md:inline">New view</span>
    </button>
  </div>
  <app-modal :open="isNewViewModalOpen" title="New view" panel-class="max-w-md" @update:open="onNewViewModalChange">
    <div class="space-y-3">
      <label class="aw-label flex flex-col gap-1">
        <span>ID</span>
        <input class="aw-input" v-model="new_view.id" type="text" placeholder="default">
      </label>
      <label class="aw-label flex flex-col gap-1">
        <span>Name</span>
        <input class="aw-input" v-model="new_view.name" type="text" placeholder="My view" @keydown.enter.prevent="handleSubmit">
      </label>
    </div>
    <template #footer>
      <button class="aw-btn aw-btn-secondary" type="button" @click="closeNewViewModal">Cancel</button>
      <button class="aw-btn aw-btn-primary" type="button" @click="handleSubmit">Create view</button>
    </template>
  </app-modal>
  <div>
    <router-view></router-view>
    <aw-devonly>
      <button class="aw-btn aw-btn-secondary" id="load-demo" @click="load_demo" type="button">Load demo data</button>
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
import { useToast } from '~/shared/composables/useToast';
import AppModal from '~/shared/ui/AppModal.vue';

import { useSettingsStore } from '~/features/settings/store/settings';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { useActivityStore, QueryOptions } from '~/features/activity/store/activity';
import { useViewsStore } from '~/features/activity/store/views';

import { defineComponent, defineAsyncComponent } from 'vue';

export default defineComponent({
  name: 'Activity',
  components: {
    'aw-uncategorized-notification': defineAsyncComponent(() => import('~/features/categorization/components/UncategorizedNotification.vue')),
    AppModal,
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

      today: null,
      showOptions: false,
      isNewViewModalOpen: false,

      include_audible: true,
      include_stopwatch: false,
      filter_afk: true,
      new_view: {
        id: '',
        name: '',
      },
    };
  },
  computed: {
    ...mapState(useViewsStore, ['views']),
    ...mapState(useSettingsStore, ['devmode']),
    ...mapState(useSettingsStore, ['always_active_pattern']),

    // number of filters currently set (different from defaults)
    filters_set() {
      return (this.filter_category ? 1 : 0) + (!this.filter_afk ? 1 : 0);
    },

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
      if (this.periodLength === 'day') {
        return periodStart.format('dddd, MMMM D, YYYY');
      } else if (this.periodLength === 'week') {
        return `Week ${periodStart.format('w')} - ${periodStart.format('MMMM D, YYYY')}`;
      } else if (this.periodLength === 'month') {
        return periodStart.format('MMMM YYYY');
      } else if (this.periodLength === 'year') {
        return periodStart.format('YYYY');
      }
      return `${periodStart.format('YYYY-MM-DD')} - ${moment(this.timeperiod.start)
        .add(...this.timeperiod.length)
        .format('YYYY-MM-DD')}`;
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
    periodIsBrowseable: function () {
      return ['day', 'week', 'month', 'year'].includes(this.periodLength);
    },
    currentView: function () {
      return this.views.find(v => v.id == this.$route.params.view_id) || this.views[0];
    },
    currentViewId: function () {
      // If localStore is not yet initialized, then currentView can be undefined. In that case, we return an empty string (which should route to the default view)
      return this.currentView !== undefined ? this.currentView.id : '';
    },
    _date: function () {
      const offset = this.settingsStore.startOfDay;
      return this.date || get_today_with_offset(offset);
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
          length: [1, this.periodLength || 'day'],
        };
      } else {
        const len = { last7d: [7, 'days'], last30d: [30, 'days'] }[this.periodLength] || [1, 'day'];
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
        periodLength = [1, this.periodLength];
      } else {
        if (this.periodLength === 'last7d') {
          periodLength = [7, 'day'];
        } else if (this.periodLength === 'last30d') {
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
      this.refresh();
    },
    timeperiod: function () {
      this.refresh();
    },
    filter_category: function () {
      this.refresh();
    },
    filter_afk: function () {
      this.refresh();
    },
    include_audible: function () {
      this.refresh();
    },
  },

  mounted: async function () {
    try {
      this.viewsStore.load();
    } catch (e) {
      console.error('Failed to load views', e);
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
    }
  },

  beforeUnmount: async function () {
    // Cancels pending requests and resets store
    await this.activityStore.reset();
  },

  methods: {
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

    setDate: function (date, periodLength) {
      // periodLength is an optional argument, default to this.periodLength
      if (!periodLength) {
        periodLength = this.periodLength;
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
    buildActivityRoute(date, periodLength = this.periodLength) {
      const params = {
        host: this.host,
        periodLength,
        date,
        subview: this.subview || 'view',
      } as Record<string, string>;

      if (this.currentViewId) {
        params.view_id = this.currentViewId;
      }

      return {
        name: 'activity-view',
        params,
        query: this.$route.query,
      };
    },

    refresh: async function (force) {
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
        always_active_pattern: this.always_active_pattern,
      };
      await this.activityStore.ensure_loaded(queryOptions);
    },

    load_demo: async function () {
      await this.activityStore.load_demo();
    },

    checkFormValidity() {
      // All checks must be false for check to pass
      const checks = {
        // Check if view id is unique
        'ID is not unique': this.viewsStore.views.map(v => v.id).includes(this.new_view.id),
        'Missing ID': this.new_view.id === '',
        'Missing name': this.new_view.name === '',
      };
      const errors = Object.entries(checks)
        .filter(([_k, v]) => v)
        .map(([k, _v]) => k);
      const valid = errors.length == 0;
      if (!valid) {
        const { error } = useToast();
        error('Invalid form input', errors.join(', '));
      }
      return valid;
    },
    openNewViewModal() {
      this.resetModal();
      this.isNewViewModalOpen = true;
    },
    closeNewViewModal() {
      this.isNewViewModalOpen = false;
      this.resetModal();
    },
    onNewViewModalChange(open) {
      this.isNewViewModalOpen = open;
      if (!open) {
        this.resetModal();
      }
    },

    handleSubmit() {
      // Exit when the form isn't valid
      const valid = this.checkFormValidity();
      if (!valid) {
        return;
      }

      const viewsStore = useViewsStore();
      viewsStore.addView({ id: this.new_view.id, name: this.new_view.name, elements: [] });
      viewsStore.save();
      this.closeNewViewModal();
    },

    resetModal() {
      this.new_view = {
        id: '',
        name: '',
      };
    },
  },
});
</script>
