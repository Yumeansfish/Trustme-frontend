import _ from 'lodash';

const level_sep = '>';
const MATCHER_METADATA_KEYS = ['exact_apps', 'aliases', 'domains', 'title_keywords'] as const;

export type MatcherMetadataKey = (typeof MATCHER_METADATA_KEYS)[number];

export interface Rule {
  type: 'regex' | 'none' | null;
  regex?: string;
  ignore_case?: boolean;
  exact_apps?: string[];
  aliases?: string[];
  domains?: string[];
  title_keywords?: string[];
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

export function annotate(c: Category) {
  const ch = c.name;
  c.name_pretty = ch.join(level_sep);
  c.subname = ch.slice(-1)[0];
  c.parent = ch.length > 1 ? ch.slice(0, -1) : undefined;
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
      .filter((p): p is string[] => Array.isArray(p))
      .map(p => {
        const name = p.join(level_sep);
        if (!all_full_names.has(name)) {
          const new_parent = annotate({ name: p, rule: { type: null } });
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
  } else if (cat.rule?.type === 'regex') {
    if (typeof cat.rule.regex === 'string') {
      const regex = cat.rule.regex.trim();
      if (regex.length > 0) {
        cat.rule.regex = regex;
      } else {
        delete cat.rule.regex;
      }
    } else {
      delete cat.rule.regex;
    }

    for (const key of MATCHER_METADATA_KEYS) {
      const values = normalizeMatcherTerms(cat.rule[key]);
      if (values.length > 0) {
        cat.rule[key] = values;
      } else {
        delete cat.rule[key];
      }
    }

    if (cat.rule.ignore_case !== undefined) {
      cat.rule.ignore_case = Boolean(cat.rule.ignore_case);
    } else if (hasMatcherMetadata(cat.rule)) {
      cat.rule.ignore_case = true;
    }
  }
  if (cat.data && typeof cat.data === 'object') {
    if (Object.keys(cat.data).length === 0) {
      delete cat.data;
    }
  }
  return cat;
}

export function normalizeMatcherTerms(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

export function hasMatcherMetadata(rule: Rule | null | undefined): boolean {
  if (!rule || rule.type !== 'regex') {
    return false;
  }

  return MATCHER_METADATA_KEYS.some(key => normalizeMatcherTerms(rule[key]).length > 0);
}
