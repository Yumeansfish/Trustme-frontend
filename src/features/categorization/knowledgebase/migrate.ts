import _ from 'lodash';
import { defaultCategories } from '~/features/categorization/lib/classes';
import type { Category } from '~/features/categorization/lib/classes';

export const CURRENT_CATEGORIZATION_KNOWLEDGEBASE_VERSION = 3;

const LEGACY_TOP_LEVEL_CATEGORIES = new Set(['Work', 'Media', 'Comms']);

function normalizeVersion(version: unknown): number {
  const normalized = Number(version);
  return Number.isFinite(normalized) ? normalized : 0;
}

function cloneCategories(categories: Category[]): Category[] {
  return _.cloneDeep(categories);
}

function categoryNameKey(category: Category): string {
  return (category?.name || []).join('>');
}

function hasSameCategoryNamesAsDefaults(categories: Category[]): boolean {
  const categoryNames = _.sortBy(categories.map(categoryNameKey));
  const defaultCategoryNames = _.sortBy(defaultCategories.map(categoryNameKey));
  return _.isEqual(categoryNames, defaultCategoryNames);
}

export function usesLegacyTaxonomy(categories: Category[] | null | undefined): boolean {
  if (!Array.isArray(categories) || categories.length === 0) {
    return false;
  }

  const topLevelCategories = [
    ...new Set(
      categories
        .map(category => category?.name?.[0])
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
    ),
  ].filter(name => name !== 'Uncategorized');

  return topLevelCategories.length > 0 && topLevelCategories.every(name => LEGACY_TOP_LEVEL_CATEGORIES.has(name));
}

export function migrateCategorySettings({
  classes,
  version,
}: {
  classes: Category[] | null | undefined;
  version: unknown;
}): {
  classes: Category[];
  version: number;
  didReplaceClasses: boolean;
  shouldPersist: boolean;
} {
  const normalizedVersion = normalizeVersion(version);
  const normalizedClasses = Array.isArray(classes) ? cloneCategories(classes) : [];

  if (normalizedVersion >= CURRENT_CATEGORIZATION_KNOWLEDGEBASE_VERSION) {
    return {
      classes: normalizedClasses,
      version: normalizedVersion,
      didReplaceClasses: false,
      shouldPersist: false,
    };
  }

  if (normalizedClasses.length === 0 || usesLegacyTaxonomy(normalizedClasses)) {
    return {
      classes: cloneCategories(defaultCategories),
      version: CURRENT_CATEGORIZATION_KNOWLEDGEBASE_VERSION,
      didReplaceClasses: true,
      shouldPersist: true,
    };
  }

  if (hasSameCategoryNamesAsDefaults(normalizedClasses)) {
    return {
      classes: cloneCategories(defaultCategories),
      version: CURRENT_CATEGORIZATION_KNOWLEDGEBASE_VERSION,
      didReplaceClasses: true,
      shouldPersist: true,
    };
  }

  return {
    classes: normalizedClasses,
    version: CURRENT_CATEGORIZATION_KNOWLEDGEBASE_VERSION,
    didReplaceClasses: false,
    shouldPersist: true,
  };
}
