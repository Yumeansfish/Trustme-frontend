import { setActivePinia, createPinia } from 'pinia';

import { useActivityStore } from '~/features/activity/store/activity';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { createClient } from '~/app/lib/awclient';

describe('activity store', () => {
  setActivePinia(createPinia());
  createClient();

  const activityStore = useActivityStore();
  const categoryStore = useCategoryStore();

  beforeEach(async () => {
    await activityStore.reset();
    await activityStore.load_demo();
  });

  test('loads demo data', () => {
    // Load
    expect(categoryStore.classes).toHaveLength(0);
    categoryStore.restoreDefaultClasses();
    expect(categoryStore.classes_unsaved_changes).toBeTruthy();
    categoryStore.save();
    expect(categoryStore.classes_unsaved_changes).toBeFalsy();
    expect(categoryStore.classes).not.toHaveLength(0);

    const editableCategoryName = categoryStore.all_categories.find(category => category[0] !== 'Uncategorized');
    expect(editableCategoryName).toBeDefined();

    let editableCategory = categoryStore.get_category(editableCategoryName);
    expect(editableCategory).not.toBeUndefined();
    editableCategory = JSON.parse(JSON.stringify(editableCategory)); // copy

    // Modify class
    const newRegex = 'Just testing';
    editableCategory.rule.regex = newRegex;
    categoryStore.updateClass(editableCategory);
    expect(categoryStore.get_category(editableCategoryName).rule.regex).toEqual(newRegex);

    // Check that getters behave somewhat
    expect(categoryStore.all_categories).not.toHaveLength(0);
    expect(categoryStore.classes_hierarchy).not.toHaveLength(0);
  });
});
