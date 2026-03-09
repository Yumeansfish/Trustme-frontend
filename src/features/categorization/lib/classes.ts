import _ from 'lodash';
import seedKnowledgebase from '~/features/categorization/knowledgebase/generated/seed-knowledgebase.v1.json';
import { compileKnowledgebase } from '~/features/categorization/knowledgebase/compile';

const level_sep = '>';

export interface Rule {
  type: 'regex' | 'none' | null;
  regex?: string;
  ignore_case?: boolean;
}

export interface Category {
  id?: number;
  name: string[];
  name_pretty?: string;
  subname?: string;
  rule: Rule;
  data?: Record<string, any>;
  depth?: number;
  parent?: string[];
  children?: Category[];
}

// The default categories
// Should be run through createMissingParents before being used in most cases.
export const defaultCategories: Category[] = compileKnowledgebase(seedKnowledgebase);

export function annotate(c: Category) {
  const ch = c.name;
  c.name_pretty = ch.join(level_sep);
  c.subname = ch.slice(-1)[0];
  c.parent = ch.length > 1 ? ch.slice(0, -1) : null;
  c.depth = ch.length - 1;
  return c;
}

export function createMissingParents(classes: Category[]): Category[] {
  // Creates parents for categories that are missing theirs (implicit parents)
  classes = _.cloneDeep(classes);
  classes = classes.slice().map(c => annotate(c));
  const all_full_names = new Set(classes.map(c => c.name.join(level_sep)));

  function _createMissing(children: Category[]) {
    children
      .map(c => c.parent)
      .filter(p => !!p)
      .map(p => {
        const name = p.join(level_sep);
        if (p && !all_full_names.has(name)) {
          const new_parent = annotate({ name: p, rule: { type: null } });
          //console.log('Creating missing parent:', new_parent);
          classes.push(new_parent);
          all_full_names.add(name);
          // New parent might not be top-level, so we need to recurse
          _createMissing([new_parent]);
        }
      });
  }

  _createMissing(classes);
  return classes;
}

export function build_category_hierarchy(classes: Category[]): Category[] {
  classes = createMissingParents(classes);

  function assignChildren(classes_at_level: Category[]) {
    return classes_at_level.map(cls => {
      cls.children = classes.filter(child => {
        return child.parent && cls.name
          ? JSON.stringify(child.parent) == JSON.stringify(cls.name)
          : false;
      });
      assignChildren(cls.children);
      return cls;
    });
  }

  return assignChildren(classes.filter(c => !c.parent));
}

export function flatten_category_hierarchy(hier: Category[]): Category[] {
  return _.flattenDeep(
    hier.map(h => {
      const level = [h, flatten_category_hierarchy(h.children)];
      h.children = [];
      return level;
    })
  );
}

export function cleanCategory(cat: Category): Category {
  cat = _.cloneDeep(cat);
  delete cat.children;
  delete cat.parent;
  delete cat.subname;
  delete cat.name_pretty;
  delete cat.depth;
  // Persisted data can still contain null placeholders from older category trees.
  // We also want to strip any excess properties that may have belonged to another rule type.
  if (cat.rule && (cat.rule.type === null || cat.rule.type === 'none')) {
    cat.rule = { type: 'none' };
  }
  return cat;
}
