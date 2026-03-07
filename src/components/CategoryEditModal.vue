<template lang="pug">
app-modal(
  :open="isOpen"
  title="Edit category"
  panel-class="max-w-2xl"
  @update:open="onModalOpenChange"
)
  div.space-y-6
    div.grid.gap-4(class="md:grid-cols-2")
      label.flex.flex-col.gap-1.text-sm.font-medium.text-slate-700
        span Name
        input.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
          v-model="editing.name"
          type="text"
          class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        )
      label.flex.flex-col.gap-1.text-sm.font-medium.text-slate-700
        span Parent
        select.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
          v-model="editing.parent"
          class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        )
          option(v-for="category in allCategories" :key="category.text" :value="category.value") {{ category.text }}

    div.space-y-4.rounded-xl.border.border-slate-200.bg-slate-50.p-4
      div.space-y-3
        h4.text-sm.font-semibold.uppercase.text-slate-500(class="tracking-[0.18em]") Rule
        label.flex.flex-col.gap-1.text-sm.font-medium.text-slate-700
          span Type
          select.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
            v-model="editing.rule.type"
            class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          )
            option(v-for="ruleType in allRuleTypes" :key="ruleType.value" :value="ruleType.value") {{ ruleType.text }}
        div(v-if="editing.rule.type === 'regex'").space-y-3
          label.flex.flex-col.gap-1.text-sm.font-medium.text-slate-700
            span Pattern
            input.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
              v-model="editing.rule.regex"
              type="text"
              class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            )
          div.flex.flex-wrap.items-center.justify-between.gap-3
            label.flex.items-center.gap-2.text-sm.text-slate-700
              input.h-4.w-4.rounded.border-slate-300.text-slate-900(
                v-model="editing.rule.ignore_case"
                type="checkbox"
                class="focus:ring-slate-400"
              )
              span Case insensitive
            div.text-sm
              div.text-rose-600(v-if="!validPattern") Invalid pattern
              div.text-amber-600(v-else-if="broad_pattern") Pattern too broad
              div.text-emerald-600(v-else) Pattern looks good

    div.grid.gap-4(class="md:grid-cols-2")
      div.space-y-3
        h4.text-sm.font-semibold.uppercase.text-slate-500(class="tracking-[0.18em]") Color
        label.flex.items-center.gap-2.text-sm.text-slate-700
          input.h-4.w-4.rounded.border-slate-300.text-slate-900(
            v-model="editing.inherit_color"
            type="checkbox"
            class="focus:ring-slate-400"
          )
          span Inherit parent color
        div(v-show="!editing.inherit_color").rounded-xl.border.border-slate-200.bg-white.p-3
          color-picker(v-model="editing.color")

      div.space-y-3
        h4.text-sm.font-semibold.uppercase.text-slate-500(class="tracking-[0.18em]") Productivity score
        label.flex.items-center.gap-2.text-sm.text-slate-700
          input.h-4.w-4.rounded.border-slate-300.text-slate-900(
            v-model="editing.inherit_score"
            type="checkbox"
            class="focus:ring-slate-400"
          )
          span Inherit parent score
        label.flex.flex-col.gap-1.text-sm.font-medium.text-slate-700(v-if="!editing.inherit_score")
          span Score
          input.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
            v-model="editing.score"
            type="number"
            class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          )
  template(#footer)
    button.mr-auto.inline-flex.h-9.items-center.justify-center.gap-2.rounded-md.border.border-rose-500.bg-rose-600.px-4.text-sm.font-medium.text-white.transition(
      type="button"
      @click="removeClass"
      class="hover:bg-rose-700"
    )
      icon(name="trash")
      span Remove category
    button.inline-flex.h-9.items-center.justify-center.rounded-md.border.border-slate-300.bg-white.px-4.text-sm.font-medium.text-slate-700.transition(
      type="button"
      @click="closeModal"
      class="hover:bg-slate-100"
    ) Cancel
    button.inline-flex.h-9.items-center.justify-center.rounded-md.border.border-slate-900.bg-slate-900.px-4.text-sm.font-medium.text-white.transition(
      type="button"
      @click="handleSubmit"
      class="hover:bg-slate-800"
    ) Save category
</template>

<script lang="ts">
import _ from 'lodash';
import ColorPicker from '~/components/ColorPicker.vue';
import AppModal from '~/components/ui/AppModal.vue';
import { useDialog } from '~/composables/useDialog';
import { useCategoryStore } from '~/stores/categories';
import { mapState } from 'pinia';
import { validateRegex, isRegexBroad } from '~/util/validate';


export default {
  name: 'CategoryEditModal',
  components: {
    'color-picker': ColorPicker,
    AppModal,
  },
  props: {
    categoryId: { type: Number, required: true },
  },
  data: function () {
    return {
      categoryStore: useCategoryStore(),
      isOpen: false,

      editing: {
        id: 0, // FIXME: Use ID assigned to category in store, in order for saves to be uniquely targeted
        name: null,
        rule: {},
        parent: [],
        inherit_color: true,
        color: null,
        inherit_score: true,
        score: null,
      },
    };
  },
  computed: {
    ...mapState(useCategoryStore, {
      allCategories: state => [{ value: [], text: 'None' }].concat(state.allCategoriesSelect),
    }),
    allRuleTypes: function () {
      return [
        { value: 'none', text: 'None' },
        { value: 'regex', text: 'Regular Expression' },
        //{ value: 'glob', text: 'Glob pattern' },
      ];
    },
    valid: function () {
      return this.editing.rule.type !== 'none' && this.validPattern;
    },
    validPattern: function () {
      return this.editing.rule.type === 'regex' && validateRegex(this.editing.rule.regex || '');
    },
    broad_pattern: function () {
      return this.editing.rule.type === 'regex' && isRegexBroad(this.editing.rule.regex || '');
    },
  },
  watch: {
    categoryId: function (new_value) {
      if (new_value !== null) {
        this.showModal();
      }
    },
  },
  mounted: function () {
    if (this.categoryId !== null) {
      this.showModal();
    }
  },
  methods: {
    showModal() {
      if (this.categoryId === null) {
        return;
      }
      this.resetModal();
      this.isOpen = true;
    },
    onModalOpenChange(open) {
      if (!open) {
        this.closeModal();
      }
    },
    closeModal() {
      this.isOpen = false;
      this.$emit('hidden');
    },
    async removeClass() {
      const { confirm } = useDialog();
      const shouldRemove = await confirm({
        title: 'Remove category',
        description: 'This removes the category from the current unsaved category tree.',
        confirmText: 'Remove',
        cancelText: 'Keep category',
      });
      if (!shouldRemove) {
        return;
      }
      this.categoryStore.removeClass(this.categoryId);
      this.closeModal();
    },
    checkFormValidity() {
      // FIXME
      return true;
    },
    handleSubmit() {
      // Exit when the form isn't valid
      if (!this.checkFormValidity()) {
        return;
      }

      // Save the category
      const new_class = {
        id: this.editing.id,
        name: this.editing.parent.concat(this.editing.name),
        rule: this.editing.rule.type !== 'none' ? this.editing.rule : { type: 'none' },
        data: {
          color: this.editing.inherit_color === true ? undefined : this.editing.color,
          score: this.editing.inherit_score === true ? undefined : this.editing.score,
        },
      };
      this.categoryStore.updateClass(new_class);
      this.$emit('ok');
      this.closeModal();
    },
    resetModal() {
      const cat = this.categoryStore.get_category_by_id(this.categoryId);
      const color = cat.data ? cat.data.color : undefined;
      const inherit_color = !color;
      const score = cat.data ? cat.data.score : undefined;
      const inherit_score = !score;
      this.editing = {
        id: cat.id,
        name: cat.subname,
        rule: _.cloneDeep(cat.rule),
        parent: cat.parent ? cat.parent : [],
        color,
        inherit_color,
        score,
        inherit_score,
      };
    },
  },
};
</script>
