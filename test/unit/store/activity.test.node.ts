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

    // Retrieve class
    let workCat = categoryStore.get_category(['Work']);
    expect(workCat).not.toBeUndefined();
    workCat = JSON.parse(JSON.stringify(workCat)); // copy

    // Modify class
    const newRegex = 'Just testing';
    workCat.rule.regex = newRegex;
    categoryStore.updateClass(workCat);
    expect(categoryStore.get_category(['Work']).rule.regex).toEqual(newRegex);

    // Check that getters behave somewhat
    expect(categoryStore.all_categories).not.toHaveLength(0);
    expect(categoryStore.classes_hierarchy).not.toHaveLength(0);
  });
});
