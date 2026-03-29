<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex items-center gap-2">
        <span class="aw-page-title">{{ customFormattedDate }}</span>
        <span v-if="showRefreshIndicator" class="aw-refresh-chip" :title="refreshIndicatorTitle">
          <icon class="h-3.5 w-3.5 animate-spin" name="sync"></icon>
        </span>
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
            :class="normalizedPeriodLength === value ? 'aw-segmented-item-active' : ''"
            @click="setCurrentPeriod(value)"
            type="button"
            >{{ label.charAt(0).toUpperCase() + label.slice(1) }}</ui-button
          >
          <ui-button
            class="aw-segmented-item"
            :class="showCustomRangeNavigator ? 'aw-segmented-item-active' : ''"
            @click.stop.prevent="openCustomRangePicker"
            type="button"
          >
            Custom
          </ui-button>
        </div>
        <date-range-navigator
          v-if="showCustomRangeNavigator"
          ref="customRangeNavigator"
          :start="customNavigatorRange.start"
          :end="customNavigatorRange.end"
          :min="earliestAvailableDate"
          :max="latestAvailableDate || latestDate"
          :available-dates="calendarAvailableDates"
          :icon-only="true"
          @close="handleCustomPickerClose"
          @select-range="selectCustomRange"
        ></date-range-navigator>
        <date-navigator
          v-else
          :model-value="_date"
          :min="earliestAvailableDate"
          :max="latestAvailableDate || latestDate"
          :available-dates="calendarAvailableDates"
          :disable-previous="!canNavigatePrevious"
          :disable-next="!canNavigateNext"
          :icon-only="true"
          @previous="goToPreviousPeriod"
          @next="goToNextPeriod"
          @select="selectCalendarDate($event)"
        ></date-navigator>
        <theme-toggle-button floating></theme-toggle-button>
      </div>
    </div>
    <div class="border-base flex flex-wrap items-center gap-2 border-b pb-2">
      <ui-link
        class="aw-tab-link"
        v-for="view in resolvedViews"
        :key="view.id"
        :to="buildViewRoute(view.id)"
        :class="currentView.id == view.id ? 'aw-tab-link-active' : ''"
        >{{ view.name }}</ui-link
      >
    </div>
    <aw-alert
      v-if="activityStore.data_notice"
      :variant="activityStore.data_notice.variant"
      show
      class="shrink-0"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-1">
          <p class="font-semibold">{{ activityStore.data_notice.title }}</p>
          <p>{{ activityStore.data_notice.message }}</p>
          <p v-if="activityStore.data_notice.items.length > 0" class="text-sm">
            Affected: {{ activityStore.data_notice.items.join(', ') }}
          </p>
        </div>
        <ui-button
          v-if="activityStore.data_path === 'dashboard'"
          class="aw-btn aw-btn-sm aw-btn-secondary shrink-0"
          type="button"
          @click="refresh(true)"
        >
          Retry
        </ui-button>
      </div>
    </aw-alert>
    <div class="relative min-h-0 flex-1 overflow-hidden">
      <router-view class="h-full"></router-view>
      <div v-if="showPendingRefreshOverlay" class="aw-refresh-overlay">
        <div class="aw-refresh-overlay-indicator">
          <icon class="h-4 w-4 animate-spin" name="sync"></icon>
        </div>
      </div>
    </div>
    <activity-category-assignment-modal></activity-category-assignment-modal>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { get_today } from '~/app/lib/time';
import DateNavigator from '~/shared/navigation/DateNavigator.vue';
import DateRangeNavigator from '~/shared/navigation/DateRangeNavigator.vue';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import ActivityCategoryAssignmentModal from '~/features/activity-categorization/components/ActivityCategoryAssignmentModal.vue';
import { useSettingsStore } from '~/features/settings/store/settings';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { useActivityStore } from '~/features/activity-dashboard/store/activity';
import { useActivityHighlightStore } from '~/features/activity-dashboard/store/highlight';
import { defaultViews } from '~/features/activity-layouts/lib/activityViewCatalog';
import {
  buildViewTabRoute,
  readCategoryFilter,
  writeCategoryFilterQuery,
} from '~/features/activity/lib/activityNavigation';
import {
  ACTIVITY_PERIOD_LABELS,
  expandActivityFilterCategories,
  formatActivityDateHeading,
} from '~/features/activity/lib/activityPresentation';
import {
  canNavigateActivityPeriod,
  normalizeCustomDateRange,
  normalizeDateForPeriod,
  resolveActivityTimeperiod,
  resolveNormalizedDate,
  resolveNormalizedPeriodLength,
  shiftPeriodDate,
} from '~/features/activity/lib/activityRouteState';
import {
  bootstrapActivityView,
  buildActivityQueryOptions,
  preloadActivityViewComponents,
  refreshActivityView,
  teardownActivityView,
  triggerReactiveActivityRefresh,
} from '~/features/activity-layouts/lib/activityViewRuntime';
import {
  ACTIVITY_REACTIVE_REFRESH_WATCHERS,
  buildActivityDateSelectionRoute,
  buildResolvedActivityRoute,
  normalizeActivityRouteIfNeeded,
  pushActivityRouteWithPendingState,
  resolveCurrentActivityView,
  resolveCurrentActivityViewId,
} from '~/features/activity/lib/activityViewNavigation';

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Activity',
  components: {
    ActivityCategoryAssignmentModal,
    DateNavigator,
    DateRangeNavigator,
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
    end: {
      type: String,
      default: '',
    },
  },
  data: function () {
    return {
      activityStore: useActivityStore(),
      categoryStore: useCategoryStore(),
      settingsStore: useSettingsStore(),
      highlightStore: useActivityHighlightStore(),

      isBootstrapping: true,
      transientCustomPickerVisible: false,
      navigationRefreshPending: false,

      include_audible: true,
      filter_afk: true,
    };
  },
  computed: {
    ...mapState(useSettingsStore, ['always_active_pattern']),

    // getter and setter for filter_category, getting and setting $route.query
    filter_category: {
      get() {
        return readCategoryFilter(this.$route.query);
      },
      set(value) {
        this.$router.push({ query: writeCategoryFilterQuery(this.$route.query, value) });
      },
    },
    customFormattedDate: function () {
      return formatActivityDateHeading(
        this.timeperiod,
        this.normalizedPeriodLength,
        this.normalizedEndDate
      );
    },
    isCustomPeriod: function () {
      return this.$route.name === 'activity-custom-view';
    },
    normalizedPeriodLength: function () {
      return this.isCustomPeriod
        ? 'custom'
        : resolveNormalizedPeriodLength(this.periodLength, this.date);
    },
    rawNormalizedDate: function () {
      return resolveNormalizedDate(this.date, this.periodLength);
    },
    customDateRange: function () {
      return this.isCustomPeriod
        ? normalizeCustomDateRange(this.rawNormalizedDate, this.end)
        : null;
    },
    normalizedDate: function () {
      return this.customDateRange?.start || this.rawNormalizedDate;
    },
    normalizedEndDate: function () {
      return this.customDateRange?.end || '';
    },
    showCustomRangeNavigator: function () {
      return this.normalizedPeriodLength === 'custom' || this.transientCustomPickerVisible;
    },
    latestDate: function () {
      return get_today();
    },
    routeScope: function () {
      return this.activityStore.scope.group_name && this.activityStore.scope.group_name !== 'ad-hoc'
        ? this.activityStore.scope.group_name
        : decodeURIComponent(this.host || '');
    },
    earliestAvailableDate: function () {
      return this.activityStore.scope.earliest_available_date;
    },
    latestAvailableDate: function () {
      return this.activityStore.scope.latest_available_date;
    },
    calendarAvailableDates: function () {
      return this.activityStore.scope.available_dates;
    },
    showRefreshIndicator: function () {
      return (
        this.navigationRefreshPending ||
        this.activityStore.is_initial_loading ||
        this.activityStore.is_refreshing
      );
    },
    showPendingRefreshOverlay: function () {
      return (
        this.navigationRefreshPending &&
        !this.activityStore.is_initial_loading &&
        !this.activityStore.is_refreshing
      );
    },
    refreshIndicatorTitle: function () {
      if (this.activityStore.refresh_kind === 'hard') {
        return 'Loading view';
      }
      return 'Refreshing';
    },
    canNavigatePrevious: function () {
      if (this.normalizedPeriodLength === 'custom') {
        return false;
      }
      return canNavigateActivityPeriod({
        targetDate: this.previousPeriod(),
        periodLength: this.normalizedPeriodLength,
        startOfWeek: this.settingsStore.startOfWeek,
        earliestAvailableDate: this.earliestAvailableDate,
        latestAvailableDate: this.latestAvailableDate,
        availableDates: this.calendarAvailableDates,
      });
    },
    canNavigateNext: function () {
      if (this.normalizedPeriodLength === 'custom') {
        return false;
      }
      return canNavigateActivityPeriod({
        targetDate: this.nextPeriod(),
        periodLength: this.normalizedPeriodLength,
        startOfWeek: this.settingsStore.startOfWeek,
        earliestAvailableDate: this.earliestAvailableDate,
        latestAvailableDate: this.latestAvailableDate,
        availableDates: this.calendarAvailableDates,
      });
    },

    periodLengths: function () {
      return ACTIVITY_PERIOD_LABELS;
    },
    resolvedViews: function () {
      return defaultViews;
    },
    periodIsBrowseable: function () {
      return ['day', 'week', 'month', 'year'].includes(this.normalizedPeriodLength);
    },
    currentView: function () {
      return resolveCurrentActivityView(this.resolvedViews, this.$route.params.view_id);
    },
    currentViewId: function () {
      return resolveCurrentActivityViewId(this.currentView);
    },
    _date: function () {
      if (this.normalizedPeriodLength === 'custom') {
        return this.normalizedDate;
      }
      return normalizeDateForPeriod(
        this.normalizedDate,
        this.normalizedPeriodLength,
        this.settingsStore.startOfWeek
      );
    },
    subview: function () {
      return this.$route.meta.subview;
    },
    filter_categories: function () {
      return expandActivityFilterCategories(
        this.filter_category,
        this.categoryStore.all_categories
      );
    },
    timeperiod: function () {
      return resolveActivityTimeperiod(
        this._date,
        this.normalizedPeriodLength,
        this.periodIsBrowseable,
        this.normalizedEndDate
      );
    },
    customNavigatorRange: function () {
      if (this.normalizedPeriodLength === 'custom') {
        return {
          start: this.normalizedDate,
          end: this.normalizedEndDate || this.normalizedDate,
        };
      }

      return {
        start: '',
        end: '',
      };
    },
  },
  watch: {
    ...ACTIVITY_REACTIVE_REFRESH_WATCHERS,
    'activityStore.is_initial_loading'(loading: boolean) {
      if (loading) {
        this.navigationRefreshPending = false;
      }
    },
    'activityStore.is_refreshing'(refreshing: boolean) {
      if (refreshing) {
        this.navigationRefreshPending = false;
      }
    },
    routeScope() {
      if (this.isBootstrapping) {
        return;
      }
      const normalizedCurrentScope = decodeURIComponent(this.host || '');
      if (!this.routeScope || this.routeScope === normalizedCurrentScope) {
        return;
      }
      void this.$router.replace(
        this.buildActivityRoute(this._date, this.normalizedPeriodLength, this.normalizedEndDate)
      );
    },
  },

  mounted: async function () {
    void preloadActivityViewComponents(this.currentView);
    try {
      await bootstrapActivityView({
        normalizeRouteIfNeeded: () => this.normalizeRouteIfNeeded(),
        categoryStore: this.categoryStore,
        refresh: () => this.refresh(),
        onError: (message, error) => console.error(message, error),
      });
    } finally {
      this.isBootstrapping = false;
    }
  },

  beforeUnmount: async function () {
    await teardownActivityView({
      highlightStore: this.highlightStore,
      activityStore: this.activityStore,
    });
  },

  methods: {
    startNavigationRefreshPending() {
      this.navigationRefreshPending = true;
    },
    stopNavigationRefreshPending() {
      this.navigationRefreshPending = false;
    },
    handleReactiveRefresh() {
      const refreshStarted = triggerReactiveActivityRefresh({
        isBootstrapping: this.isBootstrapping,
        highlightStore: this.highlightStore,
        refresh: () => {
          void this.refresh();
        },
      });
      if (refreshStarted) {
        this.stopNavigationRefreshPending();
      }
    },

    async normalizeRouteIfNeeded() {
      return normalizeActivityRouteIfNeeded({
        router: this.$router,
        route: this.$route,
        expectedRoute: this.buildActivityRoute(
          this.normalizedDate,
          this.normalizedPeriodLength,
          this.normalizedEndDate
        ),
      });
    },
    previousPeriod: function () {
      return shiftPeriodDate(this._date, this.timeperiod, 'previous');
    },
    nextPeriod: function () {
      return shiftPeriodDate(this._date, this.timeperiod, 'next');
    },
    goToPreviousPeriod() {
      if (!this.canNavigatePrevious) {
        return;
      }

      this.startNavigationRefreshPending();
      void this.$router.push(this.buildActivityRoute(this.previousPeriod()));
    },
    goToNextPeriod() {
      if (!this.canNavigateNext) {
        return;
      }

      this.startNavigationRefreshPending();
      void this.$router.push(this.buildActivityRoute(this.nextPeriod()));
    },
    async openCustomRangePicker() {
      if (this.normalizedPeriodLength !== 'custom') {
        this.transientCustomPickerVisible = true;
        await this.$nextTick();
      }
      this.$refs.customRangeNavigator?.openPopover?.();
    },
    setCurrentPeriod(periodLength: string) {
      if (periodLength === 'custom') {
        void this.openCustomRangePicker();
        return;
      }
      void this.setDate(this.latestDate, periodLength);
    },
    buildViewRoute(viewId: string) {
      return buildViewTabRoute({
        route: this.$route,
        viewId,
      });
    },
    selectCalendarDate(date: string) {
      void this.setDate(date, 'day');
    },
    async selectCustomRange({ start, end }: { start: string; end: string }) {
      this.transientCustomPickerVisible = false;
      await pushActivityRouteWithPendingState({
        router: this.$router,
        route: this.$route,
        nextRoute: this.buildActivityRoute(start, 'custom', end),
        startPending: () => this.startNavigationRefreshPending(),
        stopPending: () => this.stopNavigationRefreshPending(),
      });
    },
    handleCustomPickerClose() {
      if (this.normalizedPeriodLength !== 'custom') {
        this.transientCustomPickerVisible = false;
      }
    },

    setDate: async function (date, periodLength) {
      const nextRoute = buildActivityDateSelectionRoute({
        date,
        periodLength,
        normalizedPeriodLength: this.normalizedPeriodLength,
        startOfWeek: this.settingsStore.startOfWeek,
        host: this.routeScope,
        subview: this.subview || 'view',
        query: this.$route.query,
        requestedViewId: this.$route.params.view_id as string,
        fallbackViewId: this.currentViewId,
        resolvedViews: this.resolvedViews,
      });
      if (!nextRoute) {
        this.stopNavigationRefreshPending();
        return;
      }
      await pushActivityRouteWithPendingState({
        router: this.$router,
        route: this.$route,
        nextRoute,
        startPending: () => this.startNavigationRefreshPending(),
        stopPending: () => this.stopNavigationRefreshPending(),
      });
    },
    buildActivityRoute(date, periodLength = this.normalizedPeriodLength, endDate = '') {
      return buildResolvedActivityRoute({
        host: this.routeScope,
        date,
        endDate,
        periodLength,
        startOfWeek: this.settingsStore.startOfWeek,
        subview: this.subview || 'view',
        query: this.$route.query,
        requestedViewId: this.$route.params.view_id as string,
        fallbackViewId: this.currentViewId,
        resolvedViews: this.resolvedViews,
      });
    },

    refresh: async function (force) {
      void preloadActivityViewComponents(this.currentView);
      const queryOptions = buildActivityQueryOptions({
        host: this.routeScope,
        timeperiod: this.timeperiod,
        periodMode: this.normalizedPeriodLength,
        force,
        filterAfk: this.filter_afk,
        includeAudible: this.include_audible,
        filterCategories: this.filter_categories,
        alwaysActivePattern: this.always_active_pattern,
        currentView: this.currentView,
      });
      await refreshActivityView({
        activityStore: this.activityStore,
        highlightStore: this.highlightStore,
        queryOptions,
        force,
      });
    },
  },
});
</script>
