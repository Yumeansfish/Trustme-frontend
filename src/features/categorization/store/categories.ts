import _ from 'lodash';
import { createMissingParents, annotate } from '~/features/categorization/lib/classes';
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
      return _.uniqBy(
        _.flatten(
          this.classes.map((c: Category) => {
            const l = [];
            for (let i = 1; i <= c.name.length; i++) {
              l.push(c.name.slice(0, i));
            }
            return l;
          })
        ),
        (v: string[]) => v.join('>>>>') // Can be any separator that doesn't appear in the category names themselves
      );
    },
    allCategoriesSelect(): { value: string[]; text: string }[] {
      const categories = this.all_categories;
      const entries = categories.map(c => {
        return { text: c.join(' > '), value: c };
      });
      return _.sortBy(entries, 'text');
    },
    get_category(this: State) {
      return (category_arr: string[]): Category => {
        if (typeof category_arr === 'string' || category_arr instanceof String)
          console.error('Passed category was string, expected array. Lookup will fail.');

        const match = this.classes.find(c => _.isEqual(c.name, category_arr));
        if (!match) {
          if (!_.isEqual(category_arr, ['Uncategorized']))
            console.error("Couldn't find category: ", category_arr);
          // fallback
          return { name: ['Uncategorized'], rule: { type: 'none' } };
        }
        return annotate(_.cloneDeep(match));
      };
    },
    get_category_color() {
      return (cat: string[]): string => {
        return getColorFromCategory(this.get_category(cat), this.classes);
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
