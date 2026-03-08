import _ from 'lodash';
import {
  cleanCategory,
  defaultCategories,
  build_category_hierarchy,
  createMissingParents,
  annotate,
} from '~/features/categorization/lib/classes';
import { loadCategoryClasses, saveCategoryClasses } from '~/features/categorization/lib/categoryPersistence';
import { toQueryCategoryRules } from '~/features/categorization/lib/categoryRules';
import { getColorFromCategory } from '~/features/categorization/lib/color';
import { defineStore } from 'pinia';
import type { Category } from '~/features/categorization/lib/classes';
import type { QueryCategoryRule } from '~/features/categorization/lib/categoryRules';

interface State {
  classes: Category[];
  classes_unsaved_changes: boolean;
}

function getScoreFromCategory(c: Category, allCats: Category[]): number {
  // Returns the score for a certain category, falling back to parents if none set
  // Very similar to getColorFromCategory
  if (c && c.data && c.data.score) {
    return c.data.score;
  } else if (c && c.name.slice(0, -1).length > 0) {
    // If no color is set on category, traverse parents until one is found
    const parent = c.name.slice(0, -1);
    const parentCat = allCats.find(cc => _.isEqual(cc.name, parent));
    return getScoreFromCategory(parentCat, allCats);
  } else {
    return 0;
  }
}

export const useCategoryStore = defineStore('categories', {
  state: (): State => ({
    classes: [],
    classes_unsaved_changes: false,
  }),

  // getters
  getters: {
    classes_clean(): Category[] {
      return this.classes.map(cleanCategory);
    },
    classes_hierarchy() {
      const hier = build_category_hierarchy(_.cloneDeep(this.classes));
      return _.sortBy(hier, [c => c.id || 0]);
    },
    queryRules(): QueryCategoryRule[] {
      return toQueryCategoryRules(this.classes);
    },
    classes_for_query(): QueryCategoryRule[] {
      return this.queryRules;
    },
    all_categories(): string[][] {
      // Returns a list of category names (a list of list of strings)
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
        return { text: c.join(' > '), value: c, id: c.id };
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
    get_category_by_id(this: State) {
      return (id: number) => {
        return annotate(_.cloneDeep(this.classes.find((c: Category) => c.id == id)));
      };
    },
    get_category_color() {
      return (cat: string[]): string => {
        return getColorFromCategory(this.get_category(cat), this.classes);
      };
    },
    get_category_score() {
      return (cat: string[]): number => {
        return getScoreFromCategory(this.get_category(cat), this.classes);
      };
    },
    category_select() {
      return (insertMeta: boolean): { text: string; value?: string[] }[] => {
        // Useful for <select> elements enumerating categories
        let cats = this.all_categories;
        cats = cats
          .map((c: string[]) => {
            return { text: c.join(' > '), value: c };
          })
          .sort((a, b) => a.text > b.text);
        if (insertMeta) {
          cats = [
            { text: 'All', value: null },
            { text: 'Uncategorized', value: ['Uncategorized'] },
          ].concat(cats);
        }
        return cats;
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
      this.classes_unsaved_changes = false;
    },
    save() {
      const r = saveCategoryClasses(this.classes);
      this.classes_unsaved_changes = false;
      return r;
    },

    // mutations
    import(this: State, classes: Category[]) {
      let i = 0;
      // overwrite id even if already set
      this.classes = classes.map(c => Object.assign(c, { id: i++ }));
      this.classes_unsaved_changes = true;
    },
    updateClass(this: State, new_class: Category) {
      console.log('Updating class:', new_class);
      const old_class = this.classes.find((c: Category) => c.id === new_class.id);
      const old_name = old_class.name;
      const parent_depth = old_class.name.length;

      if (new_class.id === undefined || new_class.id === null) {
        new_class.id = _.max(_.map(this.classes, 'id')) + 1;
        this.classes.push(new_class);
      } else {
        Object.assign(old_class, new_class);
      }

      // When a parent category is renamed, we also need to rename the children.
      // Only match categories strictly longer than old_name (actual children),
      // not siblings with the same name (fixes #702).
      _.map(this.classes, c => {
        if (
          c.id !== new_class.id &&
          c.name.length > parent_depth &&
          _.isEqual(old_name, c.name.slice(0, parent_depth))
        ) {
          c.name = new_class.name.concat(c.name.slice(parent_depth));
          console.log('Renamed child:', c.name);
        }
      });

      this.classes_unsaved_changes = true;
    },
    addClass(this: State, new_class: Category) {
      new_class.id = _.max(_.map(this.classes, 'id')) + 1;
      this.classes.push(new_class);
      this.classes_unsaved_changes = true;
    },
    removeClass(this: State, classId: number) {
      this.classes = this.classes.filter((c: Category) => c.id !== classId);
      this.classes_unsaved_changes = true;
    },
    appendClassRule(this: State, classId: number, pattern: string) {
      const cat = this.classes.find((c: Category) => c.id === classId);
      if (cat.rule.type === 'none' || cat.rule.type === null) {
        cat.rule.type = 'regex';
        cat.rule.regex = pattern;
      } else if (cat.rule.type === 'regex') {
        cat.rule.regex += '|' + pattern;
      }
      this.classes_unsaved_changes = true;
    },
    restoreDefaultClasses(this: State) {
      let i = 0;
      this.classes = createMissingParents(defaultCategories).map(c =>
        Object.assign(c, { id: i++ })
      );
      this.classes_unsaved_changes = true;
    },
    clearAll(this: State) {
      this.classes = [];
      this.classes_unsaved_changes = true;
    },
  },
});
