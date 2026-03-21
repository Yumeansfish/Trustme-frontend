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
      { name: ['Planning'], rule: { type: 'none' } },
      {
        name: ['Planning', 'Docs'],
        rule: { type: 'regex', title_keywords: ['docs'], ignore_case: true },
      },
      { name: ['Uncategorized'], rule: { type: null } },
    ];

    const queryRules = toQueryCategoryRules(categories);

    expect(queryRules).toEqual([
      [['Planning'], { type: 'none' }],
      [
        ['Planning', 'Docs'],
        { type: 'regex', title_keywords: ['docs'], ignore_case: true },
      ],
    ]);

    queryRules[0][0][0] = 'Changed';
    expect(categories[0].name).toEqual(['Planning']);
  });

  test('matches deepest category across multiple texts', () => {
    const categories: Category[] = [
      { name: ['Research'], rule: { type: 'regex', domains: ['github.com'], ignore_case: true } },
      {
        name: ['Research', 'Docs'],
        rule: { type: 'regex', title_keywords: ['Trust-me'], ignore_case: true },
      },
    ];

    const match = matchCategoryAgainstTexts(
      ['GitHub', 'Trust-me dashboard', 'https://github.com/Yumeansfish/Trustme'],
      categories
    );

    expect(match).toEqual(categories[1]);
  });

  test('classifies events and falls back to uncategorized', () => {
    const categories: Category[] = [
      { name: ['Email'], rule: { type: 'regex', title_keywords: ['Gmail'], ignore_case: true } },
    ];

    const events = classifyEvents(
      [
        { timestamp: new Date().toISOString(), duration: 1, data: { app: 'Firefox', title: 'Gmail' } },
        { timestamp: new Date().toISOString(), duration: 1, data: { app: 'Terminal', title: 'shell' } },
      ],
      categories
    );

    expect(events[0].data.$category).toEqual(['Email']);
    expect(events[1].data.$category).toEqual([...UNCATEGORIZED_CATEGORY_NAME]);
  });
});
