import { cleanCategory, normalizeMatcherTerms } from '~/features/categorization/lib/classes';
import type { Category, Rule } from '~/features/categorization/lib/classes';
import {
  matchCategoryNameAgainstTexts,
  toQueryCategoryRules,
} from '~/features/categorization/lib/categoryRules';
import type { IEvent } from '~/shared/lib/interfaces';

const UNCATEGORIZED_CATEGORY = ['Uncategorized'];
const MATCHER_METADATA_KEYS = ['exact_apps', 'aliases', 'domains', 'title_keywords'] as const;

export interface ActivityCategoryAssignmentItem {
  app: string;
  duration: number;
  currentCategory: string[];
}

export interface ActivityCategoryAssignment {
  app: string;
  category: string[];
}

export interface ActivityCategorizationTarget {
  mode: 'app' | 'category';
  title: string;
  description: string;
  items: ActivityCategoryAssignmentItem[];
}

export function normalizeCategoryName(value: unknown): string[] {
  if (Array.isArray(value)) {
    const parts = value.map(part => String(part || '').trim()).filter(Boolean);
    return parts.length > 0 ? parts : [...UNCATEGORIZED_CATEGORY];
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [...UNCATEGORIZED_CATEGORY];
}

export function categoryKey(category: string[]): string {
  return JSON.stringify(normalizeCategoryName(category));
}

export function categoryFromKey(key: string): string[] {
  try {
    return normalizeCategoryName(JSON.parse(key));
  } catch {
    return [...UNCATEGORIZED_CATEGORY];
  }
}

export function categoryLabel(category: string[]): string {
  return normalizeCategoryName(category).join(' > ');
}

export function categoriesEqual(left: string[], right: string[]): boolean {
  return categoryKey(left) === categoryKey(right);
}

function explicitCategoryName(value: unknown): string[] | null {
  if (Array.isArray(value) && value.length > 0) {
    return normalizeCategoryName(value);
  }
  if (typeof value === 'string' && value.trim()) {
    return normalizeCategoryName(value);
  }
  return null;
}

function resolveCurrentAppCategory(
  app: string,
  explicitCategory: unknown,
  classes: Category[]
): string[] {
  const eventCategory = explicitCategoryName(explicitCategory);
  if (eventCategory) {
    return eventCategory;
  }

  const matchedCategory = matchCategoryNameAgainstTexts([app], toQueryCategoryRules(classes));
  return matchedCategory || [...UNCATEGORIZED_CATEGORY];
}

export function formatAssignmentDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function buildAppAssignmentItem(
  event: IEvent,
  classes: Category[] = []
): ActivityCategoryAssignmentItem | null {
  const app = typeof event?.data?.app === 'string' ? event.data.app.trim() : '';
  if (!app) {
    return null;
  }

  return {
    app,
    duration: typeof event.duration === 'number' ? event.duration : 0,
    currentCategory: resolveCurrentAppCategory(app, event.data?.['$category'], classes),
  };
}

export function buildCategoryAssignmentItems(
  category: string[],
  topApps: IEvent[] | null,
  classes: Category[] = []
): ActivityCategoryAssignmentItem[] {
  const normalizedCategory = normalizeCategoryName(category);
  return (topApps || [])
    .map(event => buildAppAssignmentItem(event, classes))
    .filter((item): item is ActivityCategoryAssignmentItem => item !== null)
    .filter(item => categoriesEqual(item.currentCategory, normalizedCategory));
}

function appIdentity(app: string): string {
  return app.trim().toLocaleLowerCase();
}

function cloneRule(rule: Rule | null | undefined): Rule {
  if (!rule) {
    return { type: 'none' };
  }
  return JSON.parse(JSON.stringify(rule)) as Rule;
}

function ruleHasMatchers(rule: Rule): boolean {
  if (rule.type !== 'regex') {
    return false;
  }

  if (typeof rule.regex === 'string' && rule.regex.trim()) {
    return true;
  }

  return MATCHER_METADATA_KEYS.some(key => normalizeMatcherTerms(rule[key]).length > 0);
}

function removeAppFromRule(rule: Rule, app: string): Rule {
  const nextRule = cloneRule(rule);
  if (nextRule.type !== 'regex') {
    return nextRule;
  }

  const removedAppKey = appIdentity(app);
  const exactApps = normalizeMatcherTerms(nextRule.exact_apps).filter(
    exactApp => appIdentity(exactApp) !== removedAppKey
  );

  if (exactApps.length > 0) {
    nextRule.exact_apps = exactApps;
  } else {
    delete nextRule.exact_apps;
  }

  return ruleHasMatchers(nextRule) ? nextRule : { type: 'none' };
}

function addAppToRule(rule: Rule, app: string): Rule {
  const normalizedApp = app.trim();
  if (!normalizedApp) {
    return cloneRule(rule);
  }

  const nextRule: Rule =
    rule?.type === 'regex'
      ? cloneRule(rule)
      : {
          type: 'regex',
          ignore_case: true,
        };

  const exactApps = normalizeMatcherTerms(nextRule.exact_apps);
  const existingAppKeys = new Set(exactApps.map(appIdentity));
  if (!existingAppKeys.has(appIdentity(normalizedApp))) {
    exactApps.push(normalizedApp);
  }

  nextRule.type = 'regex';
  nextRule.exact_apps = exactApps;
  if (nextRule.ignore_case === undefined) {
    nextRule.ignore_case = true;
  }
  return nextRule;
}

function findCategory(classes: Category[], categoryName: string[]): Category | null {
  return classes.find(category => categoriesEqual(category.name, categoryName)) || null;
}

function ensureCategory(classes: Category[], categoryName: string[]): Category {
  const existingCategory = findCategory(classes, categoryName);
  if (existingCategory) {
    return existingCategory;
  }

  const category: Category = {
    name: normalizeCategoryName(categoryName),
    rule: { type: 'none' },
  };
  classes.push(category);
  return category;
}

export function applyAppCategoryAssignments(
  classes: Category[],
  assignments: ActivityCategoryAssignment[]
): Category[] {
  const nextClasses = classes.map(category => cleanCategory(category));
  const normalizedAssignments = assignments
    .map(assignment => ({
      app: assignment.app.trim(),
      category: normalizeCategoryName(assignment.category),
    }))
    .filter(assignment => assignment.app);

  for (const assignment of normalizedAssignments) {
    for (const category of nextClasses) {
      category.rule = removeAppFromRule(category.rule, assignment.app);
    }

    const targetCategory = ensureCategory(nextClasses, assignment.category);
    targetCategory.rule = addAppToRule(targetCategory.rule, assignment.app);
  }

  return nextClasses.map(category => cleanCategory(category));
}
