<template>
<div v-if="view">
  <draggable class="flex flex-wrap -m-2" v-model="elements" handle=".handle" item-key="index">
    <template #item="{ element: el, index }">
      <div class="w-full p-2" :class="isVisFullWidth(el) ? 'w-full' : 'md:w-1/3'">
        <div class="aw-card aw-card-modal h-full">
          <aw-selectable-vis :id="index" :type="el.type" :props="el.props" :view-id="view.id" @onTypeChange="onTypeChange" @onRemove="onRemove" :editable="editing"></aw-selectable-vis>
        </div>
      </div>
    </template>
    <div class="w-full p-3 md:w-1/2 lg:w-1/3" v-if="editing">
      <button class="aw-btn aw-btn-lg aw-btn-secondary w-full" type="button" @click="addVisualization">
        <icon name="plus"></icon>
        <span>Add visualization</span>
      </button>
    </div>
  </draggable>
  <div class="mt-2 flex flex-col gap-2" v-if="editing">
    <div class="flex flex-wrap justify-end gap-2">
      <button class="aw-btn aw-btn-md aw-btn-secondary" type="button" @click="discard(); editing = !editing;">
        <icon name="times"></icon>
        <span>Cancel</span>
      </button>
      <button class="aw-btn aw-btn-md aw-btn-success" type="button" @click="save(); editing = !editing;">
        <icon name="save"></icon>
        <span>Save</span>
      </button>
    </div>
    <div class="flex flex-wrap justify-end gap-2">
      <button class="aw-btn aw-btn-sm aw-btn-danger" type="button" @click="remove();">
        <icon name="trash"></icon>
        <span>Remove</span>
      </button>
      <button class="aw-btn aw-btn-sm aw-btn-warning" type="button" @click="restoreDefaults();">
        <icon name="undo"></icon>
        <span>Restore defaults</span>
      </button>
    </div>
  </div>
  <div class="mt-2 flex justify-end" v-else>
    <button class="aw-btn aw-btn-sm aw-btn-secondary" type="button" @click="editing = !editing">
      <icon name="edit"></icon>
      <span>Edit view</span>
    </button>
  </div>
</div>
</template>

<script lang="ts">

import { mapState } from 'pinia';
import draggable from 'vuedraggable';

import { useViewsStore } from '~/features/activity/store/views';
import { useDialog } from '~/shared/composables/useDialog';
import { useToast } from '~/shared/composables/useToast';

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ActivityView',
  components: {
    draggable: draggable,
  },
  props: {
    view_id: { type: String, default: 'default' },
  },
  data() {
    return { editing: false };
  },
  computed: {
    ...mapState(useViewsStore, ['views']),
    view: function () {
      if (!this.views || this.views.length === 0) return null;
      if (this.view_id == 'default') {
        return this.views[0];
      } else {
        return this.views.find(v => v.id == this.view_id) || this.views[0];
      }
    },
    elements: {
      get() {
        return this.view ? this.view.elements : [];
      },
      set(elements) {
        if (this.view) {
          useViewsStore().setElements({ view_id: this.view.id, elements });
        }
      },
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
    isVisLarge(el) {
      return el.type == 'sunburst_clock' || el.type == 'vis_timeline';
    },
    isVisFullWidth(el) {
      return el.type == 'timeline_barchart' || this.isVisLarge(el);
    },
  },
});
</script>
