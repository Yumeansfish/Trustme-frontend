import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { get_today } from '~/app/lib/time';
import { useActivityStore } from '~/features/activity/store/activity';
import { useActivityHighlightStore } from '~/features/activity/store/highlight';
import type { ActivityPeriodMode } from '~/features/activity/store/activityTypes';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { defaultViews, type View } from '~/features/activity/lib/layout/activityViewCatalog';
import {
  bootstrapActivityView,
  buildActivityQueryOptions,
  preloadActivityViewComponents,
  refreshActivityView,
  teardownActivityView,
  triggerReactiveActivityRefresh,
} from '~/features/activity/lib/layout/activityViewRuntime';
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
  buildActivityDateSelectionRoute,
  buildResolvedActivityRoute,
  normalizeActivityRouteIfNeeded,
  pushActivityRouteWithPendingState,
  resolveCurrentActivityView,
  resolveCurrentActivityViewId,
  type ActivityRouteDescriptor,
} from '~/features/activity/lib/activityViewNavigation';
import { useSettingsStore } from '~/features/settings/store/settings';

export interface ActivityPageProps {
  host?: string;
  date?: string;
  periodLength: ActivityPeriodMode;
  end: string;
}

type DateRangeNavigatorExposed = ComponentPublicInstance & { openPopover: () => void };

export function useActivityPage(props: ActivityPageProps) {
  const route = useRoute();
  const router = useRouter();
  const activityStore = useActivityStore();
  const categoryStore = useCategoryStore();
  const settingsStore = useSettingsStore();
  const highlightStore = useActivityHighlightStore();
  const isBootstrapping = ref(true);
  const transientCustomPickerVisible = ref(false);
  const navigationRefreshPending = ref(false);
  const includeAudible = ref(true);
  const filterAfk = ref(true);
  const customRangeNavigator = ref<DateRangeNavigatorExposed>();

  const filterCategory = computed<string[] | null>({
    get: () => readCategoryFilter(route.query),
    set: value => {
      void router.push({ query: writeCategoryFilterQuery(route.query, value) });
    },
  });
  const isCustomPeriod = computed(() => route.name === 'activity-custom-view');
  const normalizedPeriodLength = computed<ActivityPeriodMode>(() =>
    isCustomPeriod.value
      ? 'custom'
      : resolveNormalizedPeriodLength(props.periodLength, props.date)
  );
  const rawNormalizedDate = computed(() => resolveNormalizedDate(props.date, props.periodLength));
  const customDateRange = computed(() =>
    isCustomPeriod.value ? normalizeCustomDateRange(rawNormalizedDate.value, props.end) : null
  );
  const normalizedDate = computed(() => customDateRange.value?.start || rawNormalizedDate.value);
  const normalizedEndDate = computed(() => customDateRange.value?.end || '');
  const latestDate = computed(get_today);
  const routeScope = computed(() =>
    activityStore.scope.group_name && activityStore.scope.group_name !== 'ad-hoc'
      ? activityStore.scope.group_name
      : decodeURIComponent(props.host || '')
  );
  const earliestAvailableDate = computed(() => activityStore.scope.earliest_available_date);
  const latestAvailableDate = computed(() => activityStore.scope.latest_available_date);
  const calendarAvailableDates = computed(() => activityStore.scope.available_dates);
  const resolvedViews = defaultViews;
  const currentView = computed<View>(
    () => resolveCurrentActivityView(resolvedViews, route.params.view_id) || defaultViews[0]!
  );
  const currentViewId = computed(() => resolveCurrentActivityViewId(currentView.value));
  const currentDate = computed(() =>
    normalizedPeriodLength.value === 'custom'
      ? normalizedDate.value
      : normalizeDateForPeriod(
          normalizedDate.value,
          normalizedPeriodLength.value
        )
  );
  const subview = computed(() =>
    typeof route.meta.subview === 'string' ? route.meta.subview : 'view'
  );
  const filterCategories = computed(() =>
    expandActivityFilterCategories(filterCategory.value, categoryStore.all_categories)
  );
  const periodIsBrowseable = computed(() =>
    ['day', 'week', 'month', 'year'].includes(normalizedPeriodLength.value)
  );
  const timeperiod = computed(() =>
    resolveActivityTimeperiod(
      currentDate.value,
      normalizedPeriodLength.value,
      periodIsBrowseable.value,
      normalizedEndDate.value
    )
  );
  const customFormattedDate = computed(() =>
    formatActivityDateHeading(
      timeperiod.value,
      normalizedPeriodLength.value,
      normalizedEndDate.value
    )
  );
  const showCustomRangeNavigator = computed(
    () => normalizedPeriodLength.value === 'custom' || transientCustomPickerVisible.value
  );
  const customNavigatorRange = computed(() =>
    normalizedPeriodLength.value === 'custom'
      ? { start: normalizedDate.value, end: normalizedEndDate.value || normalizedDate.value }
      : { start: '', end: '' }
  );
  const showRefreshIndicator = computed(
    () =>
      navigationRefreshPending.value ||
      activityStore.is_initial_loading ||
      activityStore.is_refreshing
  );
  const showPendingRefreshOverlay = computed(
    () =>
      navigationRefreshPending.value &&
      !activityStore.is_initial_loading &&
      !activityStore.is_refreshing
  );
  const refreshIndicatorTitle = computed(() =>
    activityStore.refresh_kind === 'hard' ? 'Loading view' : 'Refreshing'
  );

  const previousPeriod = () => shiftPeriodDate(currentDate.value, timeperiod.value, 'previous');
  const nextPeriod = () => shiftPeriodDate(currentDate.value, timeperiod.value, 'next');
  const canNavigate = (targetDate: string) =>
    normalizedPeriodLength.value !== 'custom' &&
    canNavigateActivityPeriod({
      targetDate,
      periodLength: normalizedPeriodLength.value,
      earliestAvailableDate: earliestAvailableDate.value,
      latestAvailableDate: latestAvailableDate.value,
      availableDates: calendarAvailableDates.value,
    });
  const canNavigatePrevious = computed(() => canNavigate(previousPeriod()));
  const canNavigateNext = computed(() => canNavigate(nextPeriod()));
  const startNavigationRefreshPending = () => {
    navigationRefreshPending.value = true;
  };
  const stopNavigationRefreshPending = () => {
    navigationRefreshPending.value = false;
  };

  const buildActivityRoute = (
    date: string,
    periodLength: ActivityPeriodMode = normalizedPeriodLength.value,
    endDate = ''
  ): ActivityRouteDescriptor =>
    buildResolvedActivityRoute({
      host: routeScope.value,
      date,
      endDate,
      periodLength,
      subview: subview.value,
      query: route.query,
      requestedViewId: route.params.view_id as string,
      fallbackViewId: currentViewId.value,
      resolvedViews,
    });
  const refresh = async (force = false) => {
    void preloadActivityViewComponents();
    await refreshActivityView({
      activityStore,
      highlightStore,
      queryOptions: buildActivityQueryOptions({
        host: routeScope.value,
        timeperiod: timeperiod.value,
        periodMode: normalizedPeriodLength.value,
        force,
        filterAfk: filterAfk.value,
        includeAudible: includeAudible.value,
        filterCategories: filterCategories.value,
        alwaysActivePattern: settingsStore.always_active_pattern,
        currentView: currentView.value,
      }),
      force,
    });
  };
  const handleReactiveRefresh = () => {
    const started = triggerReactiveActivityRefresh({
      isBootstrapping: isBootstrapping.value,
      highlightStore,
      refresh: () => void refresh(),
    });
    if (started) stopNavigationRefreshPending();
  };
  const normalizeRouteIfNeeded = () =>
    normalizeActivityRouteIfNeeded({
      router,
      route,
      expectedRoute: buildActivityRoute(
        normalizedDate.value,
        normalizedPeriodLength.value,
        normalizedEndDate.value
      ),
    });
  const pushRoute = (nextRoute: ActivityRouteDescriptor) =>
    pushActivityRouteWithPendingState({
      router,
      route,
      nextRoute,
      startPending: startNavigationRefreshPending,
      stopPending: stopNavigationRefreshPending,
    });
  const goToPreviousPeriod = () => {
    if (canNavigatePrevious.value) void pushRoute(buildActivityRoute(previousPeriod()));
  };
  const goToNextPeriod = () => {
    if (canNavigateNext.value) void pushRoute(buildActivityRoute(nextPeriod()));
  };
  const openCustomRangePicker = async () => {
    if (normalizedPeriodLength.value !== 'custom') {
      transientCustomPickerVisible.value = true;
      await nextTick();
    }
    customRangeNavigator.value?.openPopover();
  };
  const setDate = async (date: string, periodLength: string) => {
    const nextRoute = buildActivityDateSelectionRoute({
      date,
      periodLength,
      normalizedPeriodLength: normalizedPeriodLength.value,
      host: routeScope.value,
      subview: subview.value,
      query: route.query,
      requestedViewId: route.params.view_id as string,
      fallbackViewId: currentViewId.value,
      resolvedViews,
    });
    if (!nextRoute) return stopNavigationRefreshPending();
    await pushRoute(nextRoute);
  };
  const setCurrentPeriod = (periodLength: string) => {
    if (periodLength === 'custom') void openCustomRangePicker();
    else void setDate(latestDate.value, periodLength);
  };
  const selectCustomRange = async ({ start, end }: { start: string; end: string }) => {
    transientCustomPickerVisible.value = false;
    await pushRoute(buildActivityRoute(start, 'custom', end));
  };
  const handleCustomPickerClose = () => {
    if (normalizedPeriodLength.value !== 'custom') transientCustomPickerVisible.value = false;
  };
  const buildViewRoute = (viewId: string) => buildViewTabRoute({ route, viewId });

  watch(
    [() => props.host, timeperiod, filterCategory, filterAfk, includeAudible, currentViewId],
    handleReactiveRefresh,
    { deep: true }
  );
  watch(
    () => [activityStore.is_initial_loading, activityStore.is_refreshing],
    ([initialLoading, refreshing]) => {
      if (initialLoading || refreshing) stopNavigationRefreshPending();
    }
  );
  watch(routeScope, scope => {
    if (isBootstrapping.value) return;
    const currentScope = decodeURIComponent(props.host || '');
    if (scope && scope !== currentScope) {
      void router.replace(
        buildActivityRoute(currentDate.value, normalizedPeriodLength.value, normalizedEndDate.value)
      );
    }
  });

  onMounted(async () => {
    void preloadActivityViewComponents();
    try {
      await bootstrapActivityView({
        normalizeRouteIfNeeded,
        categoryStore,
        refresh,
        onError: (message, error) => console.error(message, error),
      });
    } finally {
      isBootstrapping.value = false;
    }
  });
  onBeforeUnmount(() => void teardownActivityView({ highlightStore, activityStore }));

  return {
    _date: currentDate,
    activityStore,
    buildViewRoute,
    calendarAvailableDates,
    canNavigateNext,
    canNavigatePrevious,
    currentView,
    customFormattedDate,
    customNavigatorRange,
    customRangeNavigator,
    earliestAvailableDate,
    goToNextPeriod,
    goToPreviousPeriod,
    handleCustomPickerClose,
    latestAvailableDate,
    latestDate,
    normalizedPeriodLength,
    openCustomRangePicker,
    periodLengths: ACTIVITY_PERIOD_LABELS,
    refresh,
    refreshIndicatorTitle,
    resolvedViews,
    selectCustomRange,
    setCurrentPeriod,
    setDate,
    showCustomRangeNavigator,
    showPendingRefreshOverlay,
    showRefreshIndicator,
  };
}
