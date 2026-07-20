import { createMissingParents, annotate } from '~/features/categorization/lib/classes';
import { arraysEqual, cloneJson } from '~/shared/lib/objects';
import {
  loadCategoryClasses,
  saveCategoryClasses,
} from '~/features/categorization/lib/categoryPersistence';
import { getColorFromCategory } from '~/features/categorization/lib/color';
import { defineStore } from 'pinia';
import type { Category } from '~/features/categorization/lib/classes';

interface State {
  classes: Category[];
}

export const useCategoryStore = defineStore('categories', {
  state: (): State => ({
    classes: [],
  }),

  getters: {
    all_categories(): string[][] {
      const categories = this.classes.flatMap((category: Category) =>
        Array.from({ length: category.name.length }, (_, index) => category.name.slice(0, index + 1))
      );
      return [...new Map(categories.map(category => [category.join('>>>>'), category])).values()];
    },
    allCategoriesSelect(): { value: string[]; text: string }[] {
      const categories = this.all_categories;
      const entries = categories.map(c => {
        return { text: c.join(' > '), value: c };
      });
      return entries.sort((left, right) => left.text.localeCompare(right.text));
    },
    get_category(this: State) {
      return (category_arr: string[]): Category => {
        if (typeof category_arr === 'string' || category_arr instanceof String)
          console.error('Passed category was string, expected array. Lookup will fail.');

        const match = this.classes.find(c => arraysEqual(c.name, category_arr));
        if (!match) {
          if (!arraysEqual(category_arr, ['Uncategorized']))
            console.error("Couldn't find category: ", category_arr);
          // fallback
          return { name: ['Uncategorized'], rule: { type: 'none' } };
        }
        return annotate(cloneJson(match));
      };
    },
    get_category_color() {
      return (cat: string[]): string => {
        return getColorFromCategory(this.get_category(cat));
      };
    },
  },

  actions: {
    load(this: State, classes: Category[] | null = null) {
      if (classes === null) {
        classes = loadCategoryClasses();
      }
      classes = createMissingParents(classes);

      let i = 0;
      this.classes = classes.map(c => Object.assign(c, { id: i++ }));
    },
    save() {
      return saveCategoryClasses(this.classes);
    },

    import(this: State, classes: Category[]) {
      let i = 0;
      this.classes = classes.map(c => Object.assign(c, { id: i++ }));
    },
  },
});
