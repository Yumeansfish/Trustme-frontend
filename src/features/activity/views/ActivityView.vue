<template>
  <div v-if="view" class="flex h-full min-h-0 flex-col">
    <div class="relative min-h-0 flex-1">
      <div
        class="grid min-h-0 flex-1 content-start overflow-y-auto pr-1 grid-cols-1 gap-3 lg:grid-cols-6 xl:grid-cols-12"
      >
        <template v-for="(el, index) in elements" :key="el.id || `${el.type}-${index}`">
          <div
            v-if="resolvedVisualizationType(el.type, index)"
            class="min-h-0"
            :class="[visualizationSpanClass(el, index), visualizationHeightClass(el, index)]"
          >
            <div class="aw-card aw-card-modal flex h-full min-h-0 flex-col overflow-hidden p-3">
              <aw-selectable-vis
                :type="resolvedVisualizationType(el.type, index)"
              ></aw-selectable-vis>
            </div>
          </div>
        </template>
      </div>
      <div v-if="showSoftRefreshOverlay" class="aw-refresh-overlay">
        <div class="aw-refresh-overlay-indicator">
          <icon class="h-4 w-4 animate-spin" name="sync"></icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useActivityStore } from '~/features/activity-dashboard/store/activity';
import { defaultViews } from '~/features/activity-layouts/lib/activityViewCatalog';
import {
  resolveActivityPageView,
  resolveActivityVisualizationHeightClass,
  resolveActivityVisualizationSpanClass,
  resolveActivityVisualizationType,
} from '~/features/activity-layouts/lib/activityViewLayout';

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ActivityView',
  props: {
    view_id: { type: String, default: 'default' },
  },
  data() {
    return {
      activityStore: useActivityStore(),
    };
  },
  computed: {
    resolvedViews: function () {
      return defaultViews;
    },
    view: function () {
      return resolveActivityPageView(this.resolvedViews, this.view_id);
    },
    elements() {
      return this.view ? this.view.elements : [];
    },
    showSoftRefreshOverlay() {
      return this.activityStore.is_refreshing && this.activityStore.refresh_kind === 'soft';
    },
  },
  methods: {
    resolvedVisualizationType(type, index) {
      return resolveActivityVisualizationType({
        type,
        index,
        elements: this.elements,
        bucketsLoaded: this.activityStore.buckets.loaded,
        browserAvailable: this.activityStore.browser.available,
      });
    },
    visualizationSpanClass(el, index) {
      return resolveActivityVisualizationSpanClass({
        resolvedType: this.resolvedVisualizationType(el.type, index),
      });
    },
    visualizationHeightClass(el, index) {
      return resolveActivityVisualizationHeightClass({
        resolvedType: this.resolvedVisualizationType(el.type, index),
      });
    },
  },
});
</script>
