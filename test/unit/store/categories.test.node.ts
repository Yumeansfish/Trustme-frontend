import { isEqual } from 'lodash';
import { setActivePinia, createPinia } from 'pinia';

import { useCategoryStore } from '~/features/categorization/store/categories';
import { createMissingParents, defaultCategories, Category } from '~/features/categorization/lib/classes';

describe('categories store', () => {
  setActivePinia(createPinia());
  const categoryStore = useCategoryStore();

  beforeEach(() => {
    categoryStore.clearAll();
  });

  test('loads default categories', () => {
    // Load categories
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

  test('loads custom categories', () => {
    expect(categoryStore.classes).toHaveLength(0);
    categoryStore.load([{ name: ['Test'], rule: { type: 'none' } }]);
    expect(categoryStore.all_categories).toHaveLength(1);
  });

  test('exposes query rules separately from stored classes', () => {
    categoryStore.load([
      { name: ['Planning'], rule: { type: 'none' } },
      { name: ['Planning', 'Docs'], rule: { type: 'regex', regex: 'docs' } },
      { name: ['Uncategorized'], rule: { type: null } },
    ]);

    expect(categoryStore.queryRules).toEqual([
      [['Planning'], { type: 'none' }],
      [['Planning', 'Docs'], { type: 'regex', regex: 'docs' }],
    ]);
  });

  test('get category hierarchy', () => {
    categoryStore.restoreDefaultClasses();
    const hier = categoryStore.classes_hierarchy;
    expect(hier).not.toHaveLength(0);
  });

  test('create missing parents', () => {
    const cats = createMissingParents([
      { name: ['Test', 'Subcat'], rule: { type: 'regex', regex: 'test' } },
    ]);
    expect(cats).toHaveLength(2);
  });

  test('update parent category renames children', () => {
    categoryStore.load([
      { name: ['Planning'], rule: { type: 'none' } },
      { name: ['Planning', 'Calendar'], rule: { type: 'regex', regex: 'calendar' } },
      { name: ['Uncategorized'], rule: { type: null } },
    ]);

    const planningCat: Category = categoryStore.get_category(['Planning']);
    expect(planningCat.id).not.toBeUndefined();

    categoryStore.updateClass({ ...planningCat, name: ['Coordination'], data: { test: true } });

    const renamedParent: Category = categoryStore.get_category(['Coordination']);
    expect(renamedParent.data.test).toBe(true);

    const renamedChild = categoryStore.get_category(['Coordination', 'Calendar']);
    expect(renamedChild.id).not.toBeUndefined();

    expect(defaultCategories.map(c => c.name)).not.toContainEqual(['Coordination']);
  });

  test('modify a category after deleting another', () => {
    // Deleting a category, then modifying another with an ID subsequent to it, should not
    // cause the changes to be applied to unintended classes.
    // Test against:
    // https://github.com/ActivityWatch/activitywatch/issues/361#issuecomment-970707045
    categoryStore.load([
      { name: ['Code'], rule: { type: 'regex', regex: 'code' } },
      { name: ['Video'], rule: { type: 'regex', regex: 'video' } },
      { name: ['Music'], rule: { type: 'regex', regex: 'music' } },
    ]);

    const codeCat = categoryStore.get_category(['Code']);
    const codeCatId = codeCat.id;
    expect(codeCatId).not.toBeUndefined();
    categoryStore.removeClass(codeCatId);

    expect(categoryStore.all_categories).not.toContainEqual(['Code']);

    const videoCat: Category = categoryStore.get_category(['Video']);
    const videoCatId = videoCat.id;
    expect(videoCatId).not.toBeUndefined();
    expect(videoCatId).toBeGreaterThan(codeCatId);

    categoryStore.updateClass({
      ...videoCat,
      name: ['Video2'],
      data: { test: true },
    });

    const updatedVideoCat = categoryStore.get_category_by_id(videoCatId);
    expect(updatedVideoCat.data.test).toBe(true);

    expect(categoryStore.all_categories.filter(c => isEqual(c, ['Video']))).toHaveLength(0);
    expect(categoryStore.all_categories.filter(c => isEqual(c, ['Video2']))).toHaveLength(1);
  });
});
