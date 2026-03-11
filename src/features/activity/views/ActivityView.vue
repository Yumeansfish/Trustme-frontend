<template>
  <div v-if="view" class="flex h-full min-h-0 flex-col">
    <div
      v-if="showWholeViewLoading"
      class="grid min-h-0 flex-1 content-start overflow-y-auto pr-1 grid-cols-1 gap-3 lg:grid-cols-6 xl:grid-cols-12"
    >
      <div
        v-for="(el, index) in loadingElements"
        :key="`${el.type}-${index}`"
        class="min-h-0"
        :class="[visualizationSpanClass(el), visualizationHeightClass(el)]"
      >
        <div class="aw-card aw-card-modal flex h-full min-h-0 flex-col overflow-hidden p-3">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div class="h-7 w-40 animate-pulse rounded-full bg-surface-muted"></div>
            <div class="h-7 w-16 animate-pulse rounded-full bg-surface-subtle"></div>
          </div>
          <div
            v-if="el.type === 'timeline_barchart'"
            class="grid flex-1 grid-cols-12 items-end gap-2 pt-4"
          >
            <div
              v-for="bar in timelineSkeletonBars"
              :key="bar"
              class="animate-pulse rounded-t-xl bg-surface-muted"
              :style="{ height: `${30 + (bar % 5) * 12}%` }"
            ></div>
          </div>
          <div
            v-else-if="el.type === 'category_donut'"
            class="flex flex-1 items-center justify-center"
          >
            <div
              class="h-36 w-36 animate-pulse rounded-full border-[18px] border-base bg-surface-subtle"
            ></div>
          </div>
          <div v-else class="flex flex-1 flex-col gap-3 pt-2">
            <div v-for="line in summarySkeletonLines" :key="line" class="flex items-center gap-3">
              <div class="h-7 w-12 animate-pulse rounded-full bg-surface-subtle"></div>
              <div
                class="h-4 animate-pulse rounded-full bg-surface-muted"
                :style="{ width: `${35 + ((line * 13) % 45)}%` }"
              ></div>
              <div class="ml-auto h-5 w-16 animate-pulse rounded-full bg-surface-subtle"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <draggable
      v-else
      class="grid min-h-0 flex-1 content-start overflow-y-auto pr-1 grid-cols-1 gap-3 lg:grid-cols-6 xl:grid-cols-12"
      v-model="elements"
      handle=".handle"
      item-key="index"
    >
      <template #item="{ element: el, index }">
        <div
          v-if="resolvedVisualizationType(el.type, index)"
          class="min-h-0"
          :class="[visualizationSpanClass(el, index), visualizationHeightClass(el, index)]"
        >
          <div class="aw-card aw-card-modal flex h-full min-h-0 flex-col overflow-hidden p-3">
            <aw-selectable-vis
              :id="index"
              :type="resolvedVisualizationType(el.type, index)"
              :props="el.props"
              :view-id="view.id"
              @onTypeChange="onTypeChange"
              @onRemove="onRemove"
              :editable="editing"
            ></aw-selectable-vis>
          </div>
        </div>
      </template>
      <div class="lg:col-span-3 xl:col-span-4" v-if="editing">
        <ui-button
          class="aw-btn aw-btn-lg aw-btn-secondary w-full"
          type="button"
          @click="addVisualization"
        >
          <icon name="plus"></icon>
          <span>Add visualization</span>
        </ui-button>
      </div>
    </draggable>
    <div class="mt-2 flex flex-col gap-2" v-if="editing">
      <div class="flex flex-wrap justify-end gap-2">
        <ui-button
          class="aw-btn aw-btn-md aw-btn-secondary"
          type="button"
          @click="
            discard();
            editing = !editing;
          "
        >
          <icon name="times"></icon>
          <span>Cancel</span>
        </ui-button>
        <ui-button
          class="aw-btn aw-btn-md aw-btn-success"
          type="button"
          @click="
            save();
            editing = !editing;
          "
        >
          <icon name="save"></icon>
          <span>Save</span>
        </ui-button>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <ui-button class="aw-btn aw-btn-sm aw-btn-danger" type="button" @click="remove()">
          <icon name="trash"></icon>
          <span>Remove</span>
        </ui-button>
        <ui-button class="aw-btn aw-btn-sm aw-btn-warning" type="button" @click="restoreDefaults()">
          <icon name="undo"></icon>
          <span>Restore defaults</span>
        </ui-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import draggable from 'vuedraggable';

import { useActivityStore } from '~/features/activity/store/activity';
import { defaultViews, useViewsStore } from '~/features/activity/store/views';
import { useDialog } from '~/shared/composables/useDialog';
import { useToast } from '~/shared/composables/useToast';

import { defineComponent } from 'vue';

const BROWSER_PLUGIN_VISUALIZATIONS = ['top_domains', 'top_urls', 'top_browser_titles'];
const EDITOR_PLUGIN_VISUALIZATIONS = [
  'top_editor_files',
  'top_editor_languages',
  'top_editor_projects',
];

export default defineComponent({
  name: 'ActivityView',
  components: {
    draggable: draggable,
  },
  props: {
    view_id: { type: String, default: 'default' },
  },
  data() {
    return {
      activityStore: useActivityStore(),
      editing: false,
      summarySkeletonLines: [1, 2, 3, 4, 5],
      timelineSkeletonBars: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    };
  },
  computed: {
    ...mapState(useViewsStore, ['views']),
    resolvedViews: function () {
      return this.views && this.views.length > 0 ? this.views : defaultViews;
    },
    view: function () {
      if (this.view_id == 'default') {
        return this.resolvedViews[0] || null;
      } else {
        return this.resolvedViews.find(v => v.id == this.view_id) || this.resolvedViews[0] || null;
      }
    },
    elements: {
      get() {
        return this.view ? this.view.elements : [];
      },
      set(elements) {
        if (this.view && this.views && this.views.length > 0) {
          useViewsStore().setElements({ view_id: this.view.id, elements });
        }
      },
    },
    loadingElements() {
      return this.view?.elements || [];
    },
    showWholeViewLoading() {
      if (this.editing || !this.view || !this.elements.length) {
        return false;
      }

      if (!this.activityStore.loaded || !this.activityStore.query_options) {
        return true;
      }

      if (!this.activityStore.buckets.loaded) {
        return true;
      }

      return this.elements.some(el => !this.isVisualizationReady(el.type));
    },
  },
  methods: {
    save() {
      useViewsStore().save();
    },
    discard() {
      useViewsStore().load();
    },
    remove() {
      useViewsStore().removeView({ view_id: this.view.id });
      // If we're on an URL that'll be invalid after removing the view, navigate to the main/default view
      if (!this.$route.path.includes('default')) {
        this.$router.replace('./default');
      }
    },
    restoreDefaults() {
      useViewsStore().restoreDefaults();
      const { info } = useToast();
      info(
        'Views restored',
        "All views are reset to defaults. Click 'Save' to persist this change."
      );
      // If we're on an URL that might become invalid, navigate to the main/default view
      if (!this.$route.path.includes('default')) {
        this.$router.replace('./default');
      }
    },
    addVisualization: function () {
      useViewsStore().addVisualization({ view_id: this.view.id, type: 'top_apps' });
    },
    async onTypeChange(id, type) {
      let props = {};

      if (type === 'custom_vis') {
        const { prompt } = useDialog();
        const visname = await prompt({
          title: 'Create custom visualization',
          description: 'Enter the watcher bucket prefix.',
          defaultValue: 'aw-watcher-',
          placeholder: 'aw-watcher-',
          confirmText: 'Next',
        });
        if (!visname || visname.trim() === '') return;

        const title = await prompt({
          title: 'Visualization title',
          description: 'Give the visualization a readable title.',
          placeholder: 'My custom visualization',
          confirmText: 'Create',
        });
        if (!title || title.trim() === '') return;

        props = {
          visname: visname.trim(),
          title: title.trim(),
        };
      }

      await useViewsStore().editView({ view_id: this.view.id, el_id: id, type, props });
    },
    async onRemove(id) {
      await useViewsStore().removeVisualization({ view_id: this.view.id, el_id: id });
    },
    resolvedVisualizationType(type, index) {
      if (this.editing || !this.activityStore.buckets.loaded) {
        return type;
      }

      if (
        BROWSER_PLUGIN_VISUALIZATIONS.includes(type) &&
        !this.activityStore.browser.available
      ) {
        const firstBrowserIndex = this.elements.findIndex(el =>
          BROWSER_PLUGIN_VISUALIZATIONS.includes(el.type)
        );
        return index === firstBrowserIndex ? 'browser_plugin_prompt' : null;
      }

      if (
        EDITOR_PLUGIN_VISUALIZATIONS.includes(type) &&
        !this.activityStore.editor.available
      ) {
        const firstEditorIndex = this.elements.findIndex(el =>
          EDITOR_PLUGIN_VISUALIZATIONS.includes(el.type)
        );
        return index === firstEditorIndex ? 'editor_plugin_prompt' : null;
      }

      return type;
    },
    isPluginPrompt(type) {
      return type === 'browser_plugin_prompt' || type === 'editor_plugin_prompt';
    },
    isVisLarge(el) {
      return el.type == 'sunburst_clock' || el.type == 'vis_timeline';
    },
    isVisFullWidth(el, index) {
      const resolvedType = this.resolvedVisualizationType(el.type, index);
      return (
        resolvedType === 'timeline_barchart' ||
        this.isPluginPrompt(resolvedType) ||
        this.isVisLarge(el)
      );
    },
    visualizationSpanClass(el, index) {
      return this.isVisFullWidth(el, index)
        ? 'lg:col-span-6 xl:col-span-12'
        : 'lg:col-span-3 xl:col-span-4';
    },
    visualizationHeightClass(el, index) {
      const resolvedType = this.resolvedVisualizationType(el.type, index);

      if (resolvedType === 'timeline_barchart') {
        return 'aw-vis-card-timeline';
      }

      if (
        resolvedType === 'vis_timeline' ||
        resolvedType === 'sunburst_clock' ||
        this.isPluginPrompt(resolvedType)
      ) {
        return 'aw-vis-card-tall';
      }

      return 'aw-vis-card-standard';
    },
    isVisualizationReady(type) {
      switch (type) {
        case 'top_apps':
          return this.activityStore.window.top_apps !== null;
        case 'top_titles':
          return this.activityStore.window.top_titles !== null;
        case 'top_domains':
          if (!this.activityStore.browser.available && this.activityStore.buckets.loaded) {
            return true;
          }
          return this.activityStore.browser.top_domains !== null;
        case 'top_urls':
          if (!this.activityStore.browser.available && this.activityStore.buckets.loaded) {
            return true;
          }
          return this.activityStore.browser.top_urls !== null;
        case 'top_browser_titles':
          if (!this.activityStore.browser.available && this.activityStore.buckets.loaded) {
            return true;
          }
          return this.activityStore.browser.top_titles !== null;
        case 'top_editor_files':
          if (!this.activityStore.editor.available && this.activityStore.buckets.loaded) {
            return true;
          }
          return this.activityStore.editor.top_files !== null;
        case 'top_editor_languages':
          if (!this.activityStore.editor.available && this.activityStore.buckets.loaded) {
            return true;
          }
          return this.activityStore.editor.top_languages !== null;
        case 'top_editor_projects':
          if (!this.activityStore.editor.available && this.activityStore.buckets.loaded) {
            return true;
          }
          return this.activityStore.editor.top_projects !== null;
        case 'top_categories':
        case 'category_donut':
        case 'category_tree':
        case 'category_sunburst':
        case 'score':
          return this.activityStore.category.top !== null;
        case 'timeline_barchart':
          return this.activityStore.category.by_period !== null;
        default:
          return true;
      }
    },
  },
});
</script>
