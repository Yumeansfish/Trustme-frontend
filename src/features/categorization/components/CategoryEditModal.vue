<template>
<app-modal :open="isOpen" title="Edit category" panel-class="max-w-2xl" @update:open="onModalOpenChange">
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-2">
      <label class="flex flex-col gap-1"><span class="aw-label">Name</span>
        <input class="aw-input" v-model="editing.name" type="text">
      </label>
      <label class="flex flex-col gap-1"><span class="aw-label">Parent</span>
        <select class="aw-select" v-model="editing.parent">
          <option v-for="category in allCategories" :key="category.text" :value="category.value">{{ category.text }}</option>
        </select>
      </label>
    </div>
    <div class="aw-card-muted space-y-4">
      <div class="space-y-3">
        <h4 class="aw-eyebrow">Rule</h4>
        <label class="flex flex-col gap-1"><span class="aw-label">Type</span>
          <select class="aw-select" v-model="editing.rule.type">
            <option v-for="ruleType in allRuleTypes" :key="ruleType.value" :value="ruleType.value">{{ ruleType.text }}</option>
          </select>
        </label>
        <div class="space-y-3" v-if="editing.rule.type === 'regex'">
          <label class="flex flex-col gap-1"><span class="aw-label">Pattern</span>
            <input class="aw-input" v-model="editing.rule.regex" type="text">
          </label>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <label class="flex items-center gap-2 text-sm text-foreground">
              <input class="aw-checkbox" v-model="editing.rule.ignore_case" type="checkbox"><span>Case insensitive</span>
            </label>
            <div class="text-sm">
              <div class="text-danger" v-if="!validPattern">Invalid pattern</div>
              <div class="text-warning" v-else-if="broad_pattern">Pattern too broad</div>
              <div class="text-success" v-else>Pattern looks good</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-3">
        <h4 class="aw-eyebrow">Color</h4>
        <label class="flex items-center gap-2 text-sm text-foreground">
          <input class="aw-checkbox" v-model="editing.inherit_color" type="checkbox"><span>Inherit parent color</span>
        </label>
        <div class="aw-card p-3" v-show="!editing.inherit_color">
          <color-picker v-model="editing.color"></color-picker>
        </div>
      </div>
      <div class="space-y-3">
        <h4 class="aw-eyebrow">Productivity score</h4>
        <label class="flex items-center gap-2 text-sm text-foreground">
          <input class="aw-checkbox" v-model="editing.inherit_score" type="checkbox"><span>Inherit parent score</span>
        </label>
        <label class="flex flex-col gap-1" v-if="!editing.inherit_score"><span class="aw-label">Score</span>
          <input class="aw-input" v-model="editing.score" type="number">
        </label>
      </div>
    </div>
  </div>
  <template #footer>
    <button class="aw-btn aw-btn-md aw-btn-danger mr-auto" type="button" @click="removeClass">
      <icon name="trash"></icon><span>Remove category</span>
    </button>
    <button class="aw-btn aw-btn-md aw-btn-secondary" type="button" @click="closeModal">Cancel</button>
    <button class="aw-btn aw-btn-md aw-btn-primary" type="button" @click="handleSubmit">Save category</button>
  </template>
</app-modal>
</template>

<script lang="ts">
import _ from 'lodash';
import ColorPicker from '~/shared/forms/ColorPicker.vue';
import AppModal from '~/shared/ui/AppModal.vue';
import { useDialog } from '~/shared/composables/useDialog';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { mapState } from 'pinia';
import { validateRegex, isRegexBroad } from '~/shared/lib/validate';


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
