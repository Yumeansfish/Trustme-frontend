import { defaultCategories } from '~/features/categorization/lib/classes';
import {
  CURRENT_CATEGORIZATION_KNOWLEDGEBASE_VERSION,
  migrateCategorySettings,
  usesLegacyTaxonomy,
} from '~/features/categorization/knowledgebase/migrate';
import type { Category } from '~/features/categorization/lib/classes';

describe('category knowledgebase migration', () => {
  test('detects legacy top-level taxonomy', () => {
    const legacyCategories: Category[] = [
      { name: ['Work', 'Programming'], rule: { type: 'regex', regex: 'code' } },
      { name: ['Media', 'Games'], rule: { type: 'regex', regex: 'game' } },
      { name: ['Comms', 'Email'], rule: { type: 'regex', regex: 'mail' } },
      { name: ['Uncategorized'], rule: { type: null } },
    ];

    expect(usesLegacyTaxonomy(legacyCategories)).toBe(true);
  });

  test('replaces legacy categories with knowledgebase defaults', () => {
    const migration = migrateCategorySettings({
      classes: [
        { name: ['Work', 'Programming'], rule: { type: 'regex', regex: 'code' } },
        { name: ['Media', 'Games'], rule: { type: 'regex', regex: 'game' } },
        { name: ['Uncategorized'], rule: { type: null } },
      ],
      version: 0,
    });

    expect(migration.didReplaceClasses).toBe(true);
    expect(migration.shouldPersist).toBe(true);
    expect(migration.version).toBe(CURRENT_CATEGORIZATION_KNOWLEDGEBASE_VERSION);
    expect(migration.classes.map(category => category.name)).toEqual(
      defaultCategories.map(category => category.name)
    );
  });

  test('keeps modern categories and only bumps version', () => {
    const categories: Category[] = [
      { name: ['Code'], rule: { type: 'regex', regex: 'code' } },
      { name: ['Meetings'], rule: { type: 'regex', regex: 'zoom' } },
      { name: ['Uncategorized'], rule: { type: null } },
    ];

    const migration = migrateCategorySettings({
      classes: categories,
      version: '0',
    });

    expect(migration.didReplaceClasses).toBe(false);
    expect(migration.shouldPersist).toBe(true);
    expect(migration.version).toBe(CURRENT_CATEGORIZATION_KNOWLEDGEBASE_VERSION);
    expect(migration.classes).toEqual(categories);
  });

  test('replaces untouched modern defaults when knowledgebase version increases', () => {
    const migration = migrateCategorySettings({
      classes: defaultCategories,
      version: CURRENT_CATEGORIZATION_KNOWLEDGEBASE_VERSION - 1,
    });

    expect(migration.didReplaceClasses).toBe(true);
    expect(migration.shouldPersist).toBe(true);
    expect(migration.classes.map(category => category.name)).toEqual(
      defaultCategories.map(category => category.name)
    );
  });
});
