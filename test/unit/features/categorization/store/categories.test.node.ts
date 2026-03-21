import { createPinia, setActivePinia } from 'pinia';

import { useCategoryStore } from '~/features/categorization/store/categories';

describe('categories store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test('loads categories and creates missing parent entries', () => {
    const store = useCategoryStore();
    store.load([
      {
        name: ['Work', 'Code'],
        rule: { type: 'regex', title_keywords: ['editor'], ignore_case: true },
      },
    ]);

    expect(store.all_categories).toEqual([['Work'], ['Work', 'Code']]);
    expect(store.classes.map(category => category.id)).toEqual([0, 1]);
  });

  test('exposes category options for the activity assignment flow', () => {
    const store = useCategoryStore();
    store.load([
      { name: ['Work'], rule: { type: 'none' } },
      { name: ['Work', 'Code'], rule: { type: 'none' } },
      { name: ['Personal'], rule: { type: 'none' } },
    ]);

    expect(store.allCategoriesSelect).toEqual([
      { text: 'Personal', value: ['Personal'] },
      { text: 'Work', value: ['Work'] },
      { text: 'Work > Code', value: ['Work', 'Code'] },
    ]);
  });

  test('imports an assignment result as the next complete category set', () => {
    const store = useCategoryStore();
    store.import([
      { name: ['Work'], rule: { type: 'none' }, id: 42 },
      { name: ['Personal'], rule: { type: 'none' }, id: 99 },
    ]);

    expect(store.classes.map(category => category.id)).toEqual([0, 1]);
    expect(store.get_category(['Personal']).name).toEqual(['Personal']);
  });
});
