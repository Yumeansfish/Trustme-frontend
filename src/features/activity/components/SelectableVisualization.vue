<template>
  <div class="flex h-full min-h-0 flex-col gap-2">
    <div class="flex items-start justify-between gap-3">
      <h5 class="text-foreground-strong text-base font-semibold">
        {{ visualizations[type].title }}
      </h5>
    </div>
    <div v-if="activityStore.buckets.loaded" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div v-if="pluginInstallState" class="aw-vis-content aw-vis-content-center">
        <div class="aw-plugin-callout">
          <icon class="aw-plugin-callout-icon" :name="pluginInstallState.icon" :size="46"></icon>
          <ui-link
            v-if="pluginInstallDownload"
            class="aw-btn aw-btn-md aw-plugin-callout-cta"
            :href="pluginInstallHref"
            :download="pluginInstallDownload"
            target="_blank"
            rel="noreferrer"
          >
            {{ pluginInstallCtaLabel }}
          </ui-link>
          <ui-link
            v-else
            class="aw-btn aw-btn-md aw-plugin-callout-cta"
            :href="pluginInstallHref"
            target="_blank"
            rel="noreferrer"
          >
            {{ pluginInstallCtaLabel }}
          </ui-link>
        </div>
      </div>
      <div v-else-if="!visualizationReady || !shouldRenderVisualization" class="aw-empty-state">
        <div class="aw-loading">Loading...</div>
      </div>
      <template v-else>
        <div v-if="!has_prerequisites" class="shrink-0">
          <aw-alert class="small px-2 py-1" show variant="warning">
            {{ missingPrerequisiteMessage }}
          </aw-alert>
        </div>
        <div v-if="type == visualizationTypes.TOP_APPS" class="aw-vis-content">
          <ActivitySummary
            class="h-full"
            :fields="activityStore.window.top_apps"
            :namefunc="appName"
            :selectfunc="onAppSelect"
            :editfunc="openAppCategorization"
            :editvisiblefunc="canEditAppCategorization"
            :selected-name="selectedAppName"
          />
        </div>
        <div v-if="type == visualizationTypes.TOP_DOMAINS" class="aw-vis-content">
          <ActivitySummary
            class="h-full"
            :fields="activityStore.browser.top_domains"
            :namefunc="domainName"
          />
        </div>
        <div v-if="type == visualizationTypes.TOP_URLS" class="aw-vis-content">
          <ActivitySummary
            class="h-full"
            :fields="activityStore.browser.top_urls"
            :namefunc="urlName"
          />
        </div>
        <div v-if="type == visualizationTypes.TOP_BROWSER_TITLES" class="aw-vis-content">
          <ActivitySummary
            class="h-full"
            :fields="activityStore.browser.top_titles"
            :namefunc="browserTitle"
          />
        </div>
        <div v-if="type == visualizationTypes.TOP_CATEGORIES" class="aw-vis-content">
          <ActivitySummary
            class="h-full"
            :fields="activityStore.category.top"
            :namefunc="categoryName"
            :selectfunc="onCategorySelect"
            :editfunc="openCategoryCategorization"
            :editvisiblefunc="canEditCategoryCategorization"
            :selected-name="selectedCategoryLabel"
          />
        </div>
        <div
          v-if="type == visualizationTypes.CATEGORY_DONUT"
          class="aw-vis-content aw-vis-content-center"
        >
          <CategoryDonut
            class="h-full"
            :category-events="activityStore.category.top || []"
            :app-events="activityStore.window.top_apps || []"
            :tracked-duration="activityStore.window.duration"
            :selected-category-label="selectedCategoryLabel"
            :selected-app-label="selectedAppName"
            @clear-selection="highlightStore.clear()"
            @select-category="highlightStore.setCategory($event)"
            @select-app="highlightStore.setApp($event)"
          />
        </div>
        <div v-if="type == visualizationTypes.TIMELINE_BARCHART" class="aw-vis-content">
          <TimelineBarChart
            class="h-full"
            :datasets="timelineByPeriod"
            :timeperiod_start="activityStore.query_options?.timeperiod?.start"
            :timeperiod_length="activityStore.query_options?.timeperiod?.length"
            :timeperiod_mode="activityStore.query_options?.period_mode"
            :selected-category-label="selectedCategoryLabel"
            @clear-selection="highlightStore.clear()"
          />
        </div>
      </template>
    </div>
    <div v-else class="aw-empty-state">
      <div class="aw-loading">Loading...</div>
    </div>
  </div>
</template>

<script lang="ts">
import { isActivityVisualizationReady } from '~/features/activity/lib/layout/activityViewLayout';
import {
  buildSelectableVisualizationRegistry,
  resolveBrowserInstallTarget,
  resolveMissingPrerequisiteMessage,
  resolvePluginInstallAction,
  resolvePluginInstallState,
} from '~/features/activity/lib/visualization/selectableVisualizationState';
import { ACTIVITY_VISUALIZATION } from '~/features/activity/lib/visualization/activityVisualizationRegistry';
import { useActivityHighlightStore } from '~/features/activity/store/highlight';
import { useActivityCategorizationStore } from '~/features/categorization/store/activityCategorization';
import { useCategoryStore } from '~/features/categorization/store/categories';
import {
  buildAppAssignmentItem,
  buildCategoryAssignmentItems,
  normalizeCategoryName,
} from '~/features/categorization/lib/categoryAssignment';

import { useActivityStore } from '~/features/activity/store/activity';
import type { IEvent } from '~/shared/lib/interfaces';
import ActivitySummary from '~/features/summary/components/Summary.vue';
import CategoryDonut from '~/features/summary/components/CategoryDonut.vue';
import TimelineBarChart from '~/features/summary/components/TimelineBarChart.vue';
import { defineComponent, type PropType } from 'vue';

const DEFERRED_VISUALIZATION_FRAMES: Record<string, number> = {
  [ACTIVITY_VISUALIZATION.TIMELINE_BARCHART]: 2,
};

export default defineComponent({
  name: 'SelectableVisualization',
  components: { ActivitySummary, CategoryDonut, TimelineBarChart },
  props: {
    type: {
      type: String as PropType<string>,
      required: true,
    },
  },
  data: function () {
    return {
      activityStore: useActivityStore(),
      highlightStore: useActivityHighlightStore(),
      categorizationStore: useActivityCategorizationStore(),
      categoryStore: useCategoryStore(),
      deferredVisualizationVisible: false,
      deferredVisualizationRaf: 0,
      visualizationTypes: ACTIVITY_VISUALIZATION,
    };
  },
  computed: {
    visualizations: function () {
      return buildSelectableVisualizationRegistry(this.activityStore);
    },
    browserInstallTarget() {
      if (typeof navigator === 'undefined') return 'unsupported';
      return resolveBrowserInstallTarget(navigator.userAgent);
    },
    pluginInstallHref() {
      return resolvePluginInstallAction(this.pluginInstallState, this.browserInstallTarget).href;
    },
    pluginInstallDownload() {
      return resolvePluginInstallAction(this.pluginInstallState, this.browserInstallTarget)
        .download;
    },
    pluginInstallCtaLabel() {
      return resolvePluginInstallAction(this.pluginInstallState, this.browserInstallTarget).label;
    },
    has_prerequisites() {
      return this.visualizations[this.type].available;
    },
    pluginInstallState() {
      return resolvePluginInstallState(this.type, this.activityStore);
    },
    missingPrerequisiteMessage() {
      return resolveMissingPrerequisiteMessage(this.type);
    },
    visualizationReady() {
      return isActivityVisualizationReady(this.type, this.activityStore);
    },
    deferredVisualizationFrames() {
      return DEFERRED_VISUALIZATION_FRAMES[this.type] || 0;
    },
    shouldDeferVisualizationMount() {
      return this.deferredVisualizationFrames > 0;
    },
    shouldRenderVisualization() {
      return !this.shouldDeferVisualizationMount || this.deferredVisualizationVisible;
    },
    selectedAppName() {
      return this.highlightStore.app;
    },
    selectedCategoryLabel() {
      return this.highlightStore.categoryLabel;
    },
    timelineByPeriod() {
      return this.activityStore.category.by_period;
    },
  },
  watch: {
    visualizationReady: {
      immediate: true,
      handler() {
        this.syncDeferredVisualizationMount();
      },
    },
    type() {
      this.syncDeferredVisualizationMount();
    },
  },
  beforeUnmount() {
    this.clearDeferredVisualizationMount();
  },
  methods: {
    appName(event: IEvent): string {
      return String(event.data.app || 'Unknown');
    },
    domainName(event: IEvent): string {
      return String(event.data.$domain || 'Unknown');
    },
    urlName(event: IEvent): string {
      return String(event.data.url || 'Unknown');
    },
    browserTitle(event: IEvent): string {
      return String(event.data.title || 'Unknown');
    },
    categoryName(event: IEvent): string {
      const category = event.data.$category;
      return Array.isArray(category) ? category.join(' > ') : String(category || 'Unknown');
    },
    clearDeferredVisualizationMount() {
      if (this.deferredVisualizationRaf) {
        cancelAnimationFrame(this.deferredVisualizationRaf);
        this.deferredVisualizationRaf = 0;
      }
    },
    syncDeferredVisualizationMount() {
      this.clearDeferredVisualizationMount();

      if (!this.visualizationReady) {
        this.deferredVisualizationVisible = false;
        return;
      }

      if (!this.shouldDeferVisualizationMount) {
        this.deferredVisualizationVisible = true;
        return;
      }

      this.deferredVisualizationVisible = false;

      let remainingFrames = this.deferredVisualizationFrames;
      const step = () => {
        if (remainingFrames <= 0) {
          this.deferredVisualizationVisible = true;
          this.deferredVisualizationRaf = 0;
          return;
        }

        remainingFrames -= 1;
        this.deferredVisualizationRaf = requestAnimationFrame(step);
      };

      this.deferredVisualizationRaf = requestAnimationFrame(step);
    },
    onAppSelect(event: IEvent) {
      const app = event?.data?.app || null;
      const category = event?.data?.['$category'] || null;
      if (!app) return;

      if (this.selectedAppName === app) {
        this.highlightStore.clear();
        return;
      }

      this.highlightStore.setApp({ app, category });
    },
    onCategorySelect(event: IEvent) {
      const category = event?.data?.['$category'] || null;
      if (!category) return;

      if (this.selectedCategoryLabel === category.join(' > ')) {
        this.highlightStore.clear();
        return;
      }

      this.highlightStore.setCategory(category);
    },
    canEditAppCategorization(event: IEvent) {
      return buildAppAssignmentItem(event, this.categoryStore.classes) !== null;
    },
    openAppCategorization(event: IEvent) {
      const item = buildAppAssignmentItem(event, this.categoryStore.classes);
      if (!item) {
        return;
      }

      this.categorizationStore.openApp(item);
    },
    canEditCategoryCategorization(event: IEvent) {
      return Boolean(event?.data?.['$category']);
    },
    openCategoryCategorization(event: IEvent) {
      const category = normalizeCategoryName(event?.data?.['$category']);
      const items = buildCategoryAssignmentItems(
        category,
        this.activityStore.window.top_apps,
        this.categoryStore.classes
      );
      this.categorizationStore.openCategory(category, items);
    },
  },
});
</script>
