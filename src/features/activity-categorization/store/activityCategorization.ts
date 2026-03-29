import { defineStore } from 'pinia';

import { useActivityStore } from '~/features/activity-dashboard/store/activity';
import { useCategoryStore } from '~/features/categorization/store/categories';
import {
  applyAppCategoryAssignments,
  categoryLabel,
  type ActivityCategoryAssignment,
  type ActivityCategoryAssignmentItem,
  type ActivityCategorizationTarget,
} from '~/features/activity-categorization/lib/categoryAssignment';

interface State {
  open: boolean;
  target: ActivityCategorizationTarget | null;
  saving: boolean;
  error: string;
}

export const useActivityCategorizationStore = defineStore('activityCategorization', {
  state: (): State => ({
    open: false,
    target: null,
    saving: false,
    error: '',
  }),

  actions: {
    openApp(item: ActivityCategoryAssignmentItem) {
      this.error = '';
      this.target = {
        mode: 'app',
        title: item.app,
        description: '',
        items: [item],
      };
      this.open = true;
    },

    openCategory(category: string[], items: ActivityCategoryAssignmentItem[]) {
      this.error = '';
      this.target = {
        mode: 'category',
        title: categoryLabel(category),
        description: '',
        items,
      };
      this.open = true;
    },

    close() {
      if (this.saving) {
        return;
      }
      this.open = false;
      this.target = null;
      this.error = '';
    },

    async saveAssignments(assignments: ActivityCategoryAssignment[]) {
      if (assignments.length === 0) {
        this.close();
        return;
      }

      this.saving = true;
      this.error = '';
      try {
        const categoryStore = useCategoryStore();
        const activityStore = useActivityStore();
        const updatedClasses = applyAppCategoryAssignments(categoryStore.classes, assignments);

        categoryStore.import(updatedClasses);
        await categoryStore.save();

        this.open = false;
        this.target = null;

        if (activityStore.query_options) {
          await activityStore.ensure_loaded({
            ...activityStore.query_options,
            force: true,
          });
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to save categorization.';
      } finally {
        this.saving = false;
      }
    },
  },
});
