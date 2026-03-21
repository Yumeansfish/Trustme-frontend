import { IEvent } from '~/shared/lib/interfaces';
import { Category } from '~/features/categorization/lib/classes';
import {
  classifyEvents,
  matchCategoryAgainstTexts,
  UNCATEGORIZED_CATEGORY_NAME,
} from '~/features/categorization/lib/categoryRules';

const testClasses: Category[] = [
  { name: ['Test', 'Subtest'], rule: { type: 'regex', regex: 'subtest' } },
  { name: ['Test', 'Subtest', 'Subsubtest'], rule: { type: 'regex', regex: 'subsubtest' } },
];

test('matches string to category', () => {
  const cat = matchCategoryAgainstTexts(['subsubtest'], testClasses);
  expect(cat).toEqual(testClasses[1]);
});

test('matches events to category', () => {
  let events: IEvent[] = [
    { timestamp: new Date().toISOString(), duration: 0, data: { title: 'subsubtest' } },
    { timestamp: new Date().toISOString(), duration: 0, data: { title: 'subtest' } },
    { timestamp: new Date().toISOString(), duration: 0, data: { title: 'no matching' } },
  ];
  events = classifyEvents(events, testClasses);
  expect(events[0].data.$category).toEqual(testClasses[1].name);
  expect(events[1].data.$category).toEqual(testClasses[0].name);
  expect(events[2].data.$category).toEqual([...UNCATEGORIZED_CATEGORY_NAME]);
});
