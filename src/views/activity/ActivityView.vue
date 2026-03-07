<template lang="pug">
div(v-if="view")
  draggable.flex.flex-wrap.-m-2(v-model="elements" handle=".handle" item-key="index")
    template(#item="{ element: el, index }")
      div.w-full.p-2(:class="isVisFullWidth(el) ? 'w-full' : 'md:w-1/3'")
        div.h-full.rounded-2xl.border.border-slate-200.bg-white.p-4.shadow-sm
          aw-selectable-vis(:id="index" :type="el.type" :props="el.props" :view-id="view.id" @onTypeChange="onTypeChange" @onRemove="onRemove" :editable="editing")

    div.w-full.p-3(class="md:w-1/2 lg:w-1/3" v-if="editing")
      button.inline-flex.h-11.w-full.items-center.justify-center.gap-2.rounded-md.border.border-slate-300.bg-white.px-4.text-sm.font-medium.text-slate-700.transition(
        type="button"
        @click="addVisualization"
        class="hover:bg-slate-100"
      )
        icon(name="plus")
        span Add visualization

  div.mt-2.flex.flex-col.gap-2(v-if="editing")
    div.flex.flex-wrap.justify-end.gap-2
      button.inline-flex.h-10.items-center.justify-center.gap-2.rounded-md.border.border-slate-300.bg-white.px-4.text-sm.font-medium.text-slate-700.transition(
        type="button"
        @click="discard(); editing = !editing;"
        class="hover:bg-slate-100"
      )
        icon(name="times")
        span Cancel
      button.inline-flex.h-10.items-center.justify-center.gap-2.rounded-md.border.border-emerald-500.bg-emerald-600.px-4.text-sm.font-medium.text-white.transition(
        type="button"
        @click="save(); editing = !editing;"
        class="hover:bg-emerald-700"
      )
        icon(name="save")
        span Save
    div.flex.flex-wrap.justify-end.gap-2
      button.inline-flex.h-9.items-center.justify-center.gap-2.rounded-md.border.border-rose-500.bg-rose-600.px-3.text-xs.font-medium.text-white.transition(
        type="button"
        @click="remove();"
        class="hover:bg-rose-700"
      )
        icon(name="trash")
        span Remove
      button.inline-flex.h-9.items-center.justify-center.gap-2.rounded-md.border.border-amber-400.bg-amber-500.px-3.text-xs.font-medium.text-white.transition(
        type="button"
        @click="restoreDefaults();"
        class="hover:bg-amber-600"
      )
        icon(name="undo")
        span Restore defaults
  div.mt-2.flex.justify-end(v-else)
    button.inline-flex.h-9.items-center.justify-center.gap-2.rounded-md.border.border-slate-300.bg-white.px-3.text-xs.font-medium.text-slate-700.transition(
      type="button"
      @click="editing = !editing"
      class="hover:bg-slate-100"
    )
      icon(name="edit")
      span Edit view
</template>

<script lang="ts">

import { mapState } from 'pinia';
import draggable from 'vuedraggable';

import { useViewsStore } from '~/stores/views';
import { useDialog } from '~/composables/useDialog';
import { useToast } from '~/composables/useToast';

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
