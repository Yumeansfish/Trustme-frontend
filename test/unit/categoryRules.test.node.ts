import { Category } from '~/features/categorization/lib/classes';
import {
  classifyEvents,
  matchCategoryAgainstTexts,
  toQueryCategoryRules,
  UNCATEGORIZED_CATEGORY_NAME,
} from '~/features/categorization/lib/categoryRules';

describe('category rules', () => {
  test('serializes query rules without null-only placeholders', () => {
    const categories: Category[] = [
      { name: ['Work'], rule: { type: 'none' } },
      { name: ['Work', 'Docs'], rule: { type: 'regex', regex: 'docs' } },
      { name: ['Uncategorized'], rule: { type: null } },
    ];

    const queryRules = toQueryCategoryRules(categories);

    expect(queryRules).toEqual([
      [['Work'], { type: 'none' }],
      [['Work', 'Docs'], { type: 'regex', regex: 'docs' }],
    ]);

    queryRules[0][0][0] = 'Changed';
    expect(categories[0].name).toEqual(['Work']);
  });

  test('matches deepest category across multiple texts', () => {
    const categories: Category[] = [
      { name: ['Work'], rule: { type: 'regex', regex: 'github' } },
      { name: ['Work', 'Programming'], rule: { type: 'regex', regex: 'ActivityWatch' } },
    ];

    const match = matchCategoryAgainstTexts(['GitHub', 'ActivityWatch webui'], categories);

    expect(match).toEqual(categories[1]);
  });

  test('classifies events and falls back to uncategorized', () => {
    const categories: Category[] = [
      { name: ['Comms', 'Email'], rule: { type: 'regex', regex: 'Gmail' } },
    ];

    const events = classifyEvents(
      [
        { timestamp: new Date().toISOString(), duration: 1, data: { app: 'Firefox', title: 'Gmail' } },
        { timestamp: new Date().toISOString(), duration: 1, data: { app: 'Terminal', title: 'shell' } },
      ],
      categories
    );

    expect(events[0].data.$category).toEqual(['Comms', 'Email']);
    expect(events[1].data.$category).toEqual([...UNCATEGORIZED_CATEGORY_NAME]);
  });
});
