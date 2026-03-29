<template>
  <app-modal
    :open="categorizationStore.open"
    :title="title"
    :description="description"
    panel-class="max-w-3xl"
    @update:open="handleOpenUpdate"
  >
    <aw-alert v-if="categorizationStore.error" class="mb-4" show variant="danger">
      {{ categorizationStore.error }}
    </aw-alert>

    <div v-if="items.length === 0" class="py-8 text-center text-sm text-foreground-muted">
      No applications are available for this category in the current activity window.
    </div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="item in items"
        :key="item.app"
        class="grid grid-cols-1 items-center gap-3 rounded-md border border-muted px-4 py-3 md:grid-cols-[minmax(0,1fr)_7rem_minmax(13rem,18rem)] md:gap-4"
      >
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold text-foreground-strong" :title="item.app">
            {{ item.app }}
          </div>
          <div class="mt-1 truncate text-xs text-foreground-muted">
            {{ categoryLabel(item.currentCategory) }}
          </div>
        </div>

        <div class="text-sm font-medium text-foreground-subtle md:text-right">
          {{ formatAssignmentDuration(item.duration) }}
        </div>

        <ui-select
          v-model="selectedCategoryByApp[item.app]"
          class="w-full"
          :disabled="categorizationStore.saving"
        >
          <option
            v-for="option in categoryOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </ui-select>
      </div>
    </div>

    <template #footer>
      <ui-button
        class="activity-category-action"
        type="button"
        variant="secondary"
        :disabled="categorizationStore.saving"
        @click="categorizationStore.close()"
      >
        Cancel
      </ui-button>
      <ui-button
        class="activity-category-action"
        type="button"
        variant="primary"
        :disabled="!canSave"
        @click="save"
      >
        Apply
      </ui-button>
    </template>
  </app-modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import AppModal from '~/shared/ui/AppModal.vue';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { useActivityCategorizationStore } from '~/features/activity-categorization/store/activityCategorization';
import {
  categoryFromKey,
  categoryKey,
  categoryLabel,
  formatAssignmentDuration,
  type ActivityCategoryAssignment,
  type ActivityCategoryAssignmentItem,
} from '~/features/activity-categorization/lib/categoryAssignment';

interface CategoryOption {
  label: string;
  value: string;
}

export default defineComponent({
  name: 'ActivityCategoryAssignmentModal',
  components: {
    AppModal,
  },
  data() {
    return {
      categoryStore: useCategoryStore(),
      categorizationStore: useActivityCategorizationStore(),
      selectedCategoryByApp: {} as Record<string, string>,
    };
  },
  computed: {
    title(): string {
      return this.categorizationStore.target?.title || 'Edit categorization';
    },
    description(): string {
      return this.categorizationStore.target?.description || '';
    },
    items(): ActivityCategoryAssignmentItem[] {
      return this.categorizationStore.target?.items || [];
    },
    categoryOptions(): CategoryOption[] {
      const options = this.categoryStore.allCategoriesSelect.map(option => ({
        label: option.text,
        value: categoryKey(option.value),
      }));
      const seen = new Set(options.map(option => option.value));

      for (const item of this.items) {
        const value = categoryKey(item.currentCategory);
        if (!seen.has(value)) {
          options.push({
            label: categoryLabel(item.currentCategory),
            value,
          });
          seen.add(value);
        }
      }

      return options.sort((left, right) => left.label.localeCompare(right.label));
    },
    hasChanges(): boolean {
      return this.items.some(
        item => this.selectedCategoryByApp[item.app] !== categoryKey(item.currentCategory)
      );
    },
    canSave(): boolean {
      return this.items.length > 0 && this.hasChanges && !this.categorizationStore.saving;
    },
  },
  watch: {
    'categorizationStore.target': {
      immediate: true,
      handler() {
        this.resetSelection();
      },
    },
  },
  methods: {
    categoryLabel,
    formatAssignmentDuration,
    resetSelection() {
      const selectedCategoryByApp: Record<string, string> = {};
      for (const item of this.items) {
        selectedCategoryByApp[item.app] = categoryKey(item.currentCategory);
      }
      this.selectedCategoryByApp = selectedCategoryByApp;
    },
    handleOpenUpdate(open: boolean) {
      if (!open) {
        this.categorizationStore.close();
      }
    },
    async save() {
      const assignments: ActivityCategoryAssignment[] = this.items
        .filter(item => this.selectedCategoryByApp[item.app] !== categoryKey(item.currentCategory))
        .map(item => ({
          app: item.app,
          category: categoryFromKey(this.selectedCategoryByApp[item.app]),
        }));

      await this.categorizationStore.saveAssignments(assignments);
    },
  },
});
</script>

<style scoped>
.activity-category-action {
  min-width: 6.5rem;
  height: 2.5rem;
  border-radius: 999px;
  border-color: rgb(164 158 194);
  background-color: rgb(164 158 194);
  color: rgb(255 255 255);
  font-size: 0.875rem;
  font-weight: 700;
  opacity: 1;
  cursor: pointer;
}

.activity-category-action:hover:not(:disabled) {
  border-color: rgb(148 141 183);
  background-color: rgb(148 141 183);
}

.activity-category-action:disabled {
  border-color: rgb(188 199 213);
  background-color: rgb(222 229 237);
  color: rgb(102 119 144);
  cursor: default;
  opacity: 1;
}
</style>
