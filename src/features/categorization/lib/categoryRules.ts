import _ from 'lodash';
import type { IEvent } from '~/shared/lib/interfaces';
import type { Category, Rule } from './classes';

const CLASSIFY_KEYS = ['app', 'title'] as const;

export const UNCATEGORIZED_CATEGORY_NAME = ['Uncategorized'] as const;

export type QueryCategoryRule = [string[], Rule];
type CompiledQueryCategoryRule = [QueryCategoryRule, RegExp];

function pickDeepestCategoryName(categoryNames: string[][]): string[] | null {
  return _.maxBy(categoryNames, categoryName => categoryName.length) || null;
}

function compileQueryCategoryRule(rule: QueryCategoryRule): CompiledQueryCategoryRule | null {
  const [, definition] = rule;
  if (definition.type !== 'regex' || !definition.regex) {
    return null;
  }

  const regex = RegExp(definition.regex, (definition.ignore_case ? 'i' : '') + 'm');
  return [rule, regex];
}

export function toQueryCategoryRules(categories: Pick<Category, 'name' | 'rule'>[]): QueryCategoryRule[] {
  return categories
    .filter(category => category.rule.type !== null)
    .map(category => [_.cloneDeep(category.name), _.cloneDeep(category.rule)] as QueryCategoryRule);
}

export function serializeQueryCategoryRules(rules: QueryCategoryRule[]): string {
  return JSON.stringify(rules).replace(/\\\\/g, '\\');
}

export function compileQueryCategoryRules(rules: QueryCategoryRule[]): CompiledQueryCategoryRule[] {
  return rules
    .map(compileQueryCategoryRule)
    .filter((rule): rule is CompiledQueryCategoryRule => rule !== null);
}

export function matchCategoryNameAgainstTexts(
  texts: Array<string | null | undefined>,
  rules: QueryCategoryRule[]
): string[] | null {
  return matchCompiledCategoryNameAgainstTexts(texts, compileQueryCategoryRules(rules));
}

export function matchCompiledCategoryNameAgainstTexts(
  texts: Array<string | null | undefined>,
  compiledRules: CompiledQueryCategoryRule[]
): string[] | null {
  const normalizedTexts = texts.filter((text): text is string => typeof text === 'string');
  const matchingCategoryNames = compiledRules
    .filter(([, regex]) => normalizedTexts.some(text => regex.test(text)))
    .map(([[categoryName]]) => categoryName);

  if (matchingCategoryNames.length === 0) {
    return null;
  }

  return pickDeepestCategoryName(matchingCategoryNames);
}

export function matchCategoryAgainstTexts(
  texts: Array<string | null | undefined>,
  categories: Category[]
): Category | null {
  const matchedCategoryName = matchCategoryNameAgainstTexts(texts, toQueryCategoryRules(categories));
  if (!matchedCategoryName) {
    return null;
  }

  return categories.find(category => _.isEqual(category.name, matchedCategoryName)) || null;
}

export function classifyEvents(events: IEvent[], categories: Category[]): IEvent[] {
  const compiledRules = compileQueryCategoryRules(toQueryCategoryRules(categories));

  return events.map((event: IEvent) => {
    const matchedCategoryName = matchCompiledCategoryNameAgainstTexts(
      CLASSIFY_KEYS.map(key => event.data[key]),
      compiledRules
    );

    event.data.$category = matchedCategoryName || [...UNCATEGORIZED_CATEGORY_NAME];
    return event;
  });
}
