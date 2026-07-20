<template>
  <div v-if="view" class="aw-activity-view flex h-full min-h-0 flex-col">
    <div class="relative flex min-h-0 flex-1">
      <div
        class="grid h-full min-h-0 w-full grid-cols-1 gap-3 overflow-y-auto pr-1 lg:grid-cols-6 xl:grid-cols-12"
      >
        <template v-for="(el, index) in elements" :key="el.id || `${el.type}-${index}`">
          <div
            v-if="resolvedVisualizationType(el.type, index)"
            class="min-h-0"
            :class="[visualizationSpanClass(el, index), visualizationHeightClass(el, index)]"
          >
            <div class="aw-card flex h-full min-h-0 flex-col overflow-hidden p-3">
              <SelectableVisualization
                :type="resolvedVisualizationType(el.type, index) || el.type"
              />
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
import { useActivityStore } from '~/features/activity/store/activity';
import { defaultViews, type ViewElement } from '~/features/activity/lib/layout/activityViewCatalog';
import SelectableVisualization from '~/features/activity/components/SelectableVisualization.vue';
import {
  resolveActivityPageView,
  resolveActivityVisualizationHeightClass,
  resolveActivityVisualizationSpanClass,
  resolveActivityVisualizationType,
} from '~/features/activity/lib/layout/activityViewLayout';

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ActivityView',
  components: { SelectableVisualization },
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
    resolvedVisualizationType(type: string, index: number) {
      return resolveActivityVisualizationType({
        type,
        index,
        elements: this.elements,
        bucketsLoaded: this.activityStore.buckets.loaded,
        browserAvailable: this.activityStore.browser.available,
      });
    },
    visualizationSpanClass(el: ViewElement, index: number) {
      return resolveActivityVisualizationSpanClass({
        resolvedType: this.resolvedVisualizationType(el.type, index),
      });
    },
    visualizationHeightClass(el: ViewElement, index: number) {
      return resolveActivityVisualizationHeightClass({
        resolvedType: this.resolvedVisualizationType(el.type, index),
      });
    },
  },
});
</script>
