<template>
  <div class="aw-activity-page flex h-full min-h-0 flex-col gap-3">
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
          @select="setDate($event, 'day')"
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
          v-if="activityStore.data_path === 'activity'"
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
    <activity-category-assignment-modal @saved="refresh(true)"></activity-category-assignment-modal>
  </div>
</template>

<script lang="ts">
import DateNavigator from '~/shared/navigation/DateNavigator.vue';
import DateRangeNavigator from '~/shared/navigation/DateRangeNavigator.vue';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import ActivityCategoryAssignmentModal from '~/features/categorization/components/ActivityCategoryAssignmentModal.vue';
import type { ActivityPeriodMode } from '~/features/activity/store/activityTypes';
import { useActivityPage } from '~/features/activity/lib/useActivityPage';
import { defineComponent, type PropType } from 'vue';

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
      type: String as PropType<ActivityPeriodMode>,
      default: 'day',
    },
    end: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return useActivityPage(props);
  },
});
</script>
