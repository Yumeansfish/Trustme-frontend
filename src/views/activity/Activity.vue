<template lang="pug">
div
  div.d-flex.align-items-center.justify-content-between.mb-4.mt-3.rize-header
    div.rize-title
      span {{ customFormattedDate }}

    div.d-flex.align-items-center.rize-controls
      button.rize-icon-btn.mr-3(@click="refresh(true)" title="Refresh")
        icon(name="sync")

      div.rize-segmented-control.mr-3.d-none.d-md-flex
        button(
          v-for="(label, value) in periodLengths"
          :key="value"
          :class="{ active: periodLength === value }"
          @click="setDate(_date, value)"
        ) {{ label.charAt(0).toUpperCase() + label.slice(1) }}

      div.rize-nav-pill.mr-3
        router-link.rize-nav-btn(
          :to="link_prefix + '/' + previousPeriod() + '/' + subview + '/' + currentViewId"
          tag="button"
        )
          icon(name="arrow-left")

        div.rize-nav-date
          icon(name="calendar")
          input(
            type="date"
            :value="_date"
            :max="today"
            @change="setDate($event.target.value, periodLength)"
          )

        router-link.rize-nav-btn(
          :to="link_prefix + '/' + nextPeriod() + '/' + subview + '/' + currentViewId"
          tag="button"
          :disabled="nextPeriod() > today"
        )
          icon(name="arrow-right")

      button.rize-icon-btn(:class="{ active: showOptions }" @click="showOptions = !showOptions" title="Filters")
        icon(name="filter")
        span.rize-badge(v-if="filters_set > 0") {{ filters_set }}

  div.row(v-if="showOptions" style="background-color: #EEE;").my-3.py-3
    div.col-md-12
      h5 Filters
    div.col-md-6
      b-form-checkbox(v-model="filter_afk" size="sm")
        | Exclude AFK time
        icon#filterAFKHelp(name="question-circle" style="opacity: 0.4")
        b-tooltip(target="filterAFKHelp" v-b-tooltip.hover title="Filter away time where the AFK watcher didn't detect any input.")
      b-form-checkbox(v-model="include_audible" :disabled="!filter_afk" size="sm")
        | Count audible browser tab as active
        icon#includeAudibleHelp(name="question-circle" style="opacity: 0.4")
        b-tooltip(target="includeAudibleHelp" v-b-tooltip.hover title="If the active window is an audible browser tab, count as active. Requires a browser watcher.")

      b-form-checkbox(v-if="devmode" v-model="include_stopwatch" size="sm")
        // WIP: https://github.com/ActivityWatch/aw-webui/pull/368
        | Include manually logged events (stopwatch)
        br
        | #[b Note:] WIP. Stopwatch events shadow other events, when overlapping with them. Only shown in devmode.

    div.col-md-6.mt-2.mt-md-0
      b-form-group(label="Show category" label-cols="5" label-cols-lg="4" style="font-size: 0.88em")
        b-form-select(v-model="filter_category", :options="categoryStore.category_select(true)" size="sm")




  ul.row.nav.nav-tabs.mt-4
    li.nav-item(v-for="view in views")
      router-link.nav-link(:to="{ name: 'activity-view', params: {...$route.params, view_id: view.id}, query: $route.query}" :class="{'router-link-exact-active': currentView.id == view.id}")
        h6 {{view.name}}

    li.nav-item(style="margin-left: auto")
      a.nav-link(@click="$refs.new_view.show()")
        h6
          icon(name="plus")
          span.d-none.d-md-inline
            | New view

  b-modal(id="new_view" ref="new_view" title="New view" @show="resetModal" @hidden="resetModal" @ok="handleOk")
    div.my-1
      b-input-group.my-1(prepend="ID")
        b-form-input(v-model="new_view.id")
      b-input-group.my-1(prepend="Name")
        b-form-input(v-model="new_view.name")

  div
    router-view

    aw-devonly
      b-btn(id="load-demo", @click="load_demo")
        | Load demo data
</template>

<style lang="scss" scoped>
@import '../../style/globals';

// Rize-style Header
.rize-title {
  font-size: 1.45rem;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: -0.01em;

  .rize-subtitle {
    font-size: 0.85rem;
    font-weight: 500;
    color: #888;
  }
}

.rize-controls {
  display: flex;
  align-items: center;
}

.rize-icon-btn {
  background: transparent;
  border: none;
  color: #a0a0ba;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    color: #1a1a2e;
    background: #f3f3f8;
  }

  &.active {
    color: #6c63ff;
    background: #edeaff;
  }

  svg {
    width: 16px;
    height: 16px;
  }

  .rize-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: #6c63ff;
    color: #fff;
    font-size: 0.65rem;
    font-weight: bold;
    border-radius: 10px;
    padding: 2px 5px;
    line-height: 1;
  }
}

.rize-segmented-control {
  display: flex;
  background: #edeaff;
  border-radius: 20px;
  padding: 4px;

  button {
    background: transparent;
    border: none;
    border-radius: 16px;
    padding: 6px 16px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #6c63ff;
    transition: all 0.2s ease;

    &:hover {
      color: #1a1a2e;
    }

    &.active {
      background: #fff;
      color: #1a1a2e;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
    }
  }
}

.rize-nav-pill {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #e2e2ec;
  border-radius: 20px;
  height: 34px;
  padding: 0 4px;

  .rize-nav-btn {
    background: transparent;
    border: none;
    color: #6c7a89;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background: #f3f3f8;
      color: #1a1a2e;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    svg {
      width: 12px;
      height: 12px;
    }
  }

  .rize-nav-date {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 26px;
    color: #6c7a89;
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
      color: #1a1a2e;
    }

    svg {
      width: 14px;
      height: 14px;
    }

    input[type='date'] {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;

      &::-webkit-calendar-picker-indicator {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        cursor: pointer;
      }
    }
  }
}

// Filters 展开区
.row[style*='background-color'] {
  background-color: #f8f8fc !important;
  border-radius: $card-radius;
  border: $card-border;
}

// 子视图 Tab 导航
.nav {
  border-bottom: 1px solid $lightBorderColor;
  margin-top: 20px;

  .nav-item {
    margin-bottom: 0;

    &:first-child {
      margin-left: 0;
    }

    .nav-link {
      padding: 0.35rem 1rem;
      color: #888;
      cursor: pointer;
      border: none;
      font-size: 0.9rem;
      border-bottom: 3px solid transparent;

      &:hover {
        color: #333 !important;
        border-bottom-color: #ddd;
        border-radius: 0;
      }

      &.router-link-exact-active {
        color: $primary !important;
        border-bottom: 3px solid $primary;
        border-radius: 0;
        font-weight: 600;

        &:hover {
          background-color: #fff;
        }
      }
    }
  }
}
</style>

<script lang="ts">
import { mapState } from 'pinia';
import moment from 'moment';
import { get_day_start_with_offset, get_today_with_offset } from '~/util/time';
import { periodLengthConvertMoment } from '~/util/timeperiod';
import _ from 'lodash';

import 'vue-awesome/icons/arrow-left';
import 'vue-awesome/icons/arrow-right';
import 'vue-awesome/icons/sync';
import 'vue-awesome/icons/plus';
import 'vue-awesome/icons/edit';
import 'vue-awesome/icons/times';
import 'vue-awesome/icons/save';
import 'vue-awesome/icons/question-circle';
import 'vue-awesome/icons/filter';
import 'vue-awesome/icons/calendar';

import { useSettingsStore } from '~/stores/settings';
import { useCategoryStore } from '~/stores/categories';
import { useActivityStore, QueryOptions } from '~/stores/activity';
import { useViewsStore } from '~/stores/views';

export default {
  name: 'Activity',
  components: {
    'aw-uncategorized-notification': () => import('~/components/UncategorizedNotification.vue'),
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

      include_audible: true,
      include_stopwatch: false,
      filter_afk: true,
      new_view: {},
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
      return `${periodStart.format('YYYY-MM-DD')} — ${moment(this.timeperiod.start)
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
    link_prefix: function () {
      return `/activity/${this.host}/${this.periodLength}`;
    },
    periodusage: function () {
      return this.activityStore.getActiveHistoryAroundTimeperiod(this.timeperiod);
    },
    timeperiod: function () {
      const settingsStore = useSettingsStore();

      if (this.periodIsBrowseable) {
        return {
          start: get_day_start_with_offset(this._date, settingsStore.startOfDay),
          length: [1, this.periodLength],
        };
      } else {
        const len = { last7d: [7, 'days'], last30d: [30, 'days'] }[this.periodLength];
        return {
          start: get_day_start_with_offset(
            moment(this._date).subtract(len[0] - 1, len[1]),
            settingsStore.startOfDay
          ),
          length: len,
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
    this.viewsStore.load();
    this.categoryStore.load();
    try {
      await this.refresh();
    } catch (e) {
      if (e.message !== 'canceled') {
        console.error(e);
        throw e;
      }
    }
  },

  beforeDestroy: async function () {
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
      const path = `/activity/${this.host}/${periodLength}/${new_date}/${this.subview}/${this.currentViewId}`;
      if (this.$route.path !== path) {
        this.$router.push({
          path,
          query: this.$route.query,
        });
      }
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
        alert(`Invalid form input: ${errors}`);
      }
      return valid;
    },

    handleOk(event) {
      // Prevent modal from closing
      event.preventDefault();
      // Trigger submit handler
      this.handleSubmit();
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

      // Hide the modal manually
      this.$nextTick(() => {
        this.$refs.new_view.hide();
      });
    },

    resetModal() {
      this.new_view = {
        id: '',
        name: '',
      };
    },
  },
};
</script>
