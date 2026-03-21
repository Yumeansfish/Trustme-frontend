import _ from 'lodash';
import type { IEvent } from '~/shared/lib/interfaces';
import { hasMatcherMetadata, normalizeMatcherTerms, type Category, type Rule } from './classes';

const CLASSIFY_KEYS = ['app', 'title', '$domain', 'url'] as const;

export const UNCATEGORIZED_CATEGORY_NAME = ['Uncategorized'] as const;

export type QueryCategoryRule = [string[], Rule];
type CompiledQueryCategoryRule = [QueryCategoryRule, RegExp];

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildBoundaryPattern(values: string[]): string[] {
  return values.map(value => {
    const escaped = escapeRegexLiteral(value).replace(/\s+/g, '\\s+');
    return `(?:^|[^A-Za-z0-9])${escaped}(?:$|[^A-Za-z0-9])`;
  });
}

function buildDomainPattern(values: string[]): string[] {
  return values.map(value => {
    const escaped = escapeRegexLiteral(value.toLowerCase());
    return `(?:^|[^A-Za-z0-9])${escaped}(?:$|[^A-Za-z0-9])`;
  });
}

function buildMaterializedRegex(definition: Rule): string | null {
  const explicitRegex = typeof definition.regex === 'string' ? definition.regex.trim() : '';
  const exactApps = normalizeMatcherTerms(definition.exact_apps);
  const aliases = normalizeMatcherTerms(definition.aliases);
  const domains = normalizeMatcherTerms(definition.domains);
  const titleKeywords = normalizeMatcherTerms(definition.title_keywords);

  const patterns = [
    ...buildBoundaryPattern(exactApps),
    ...buildBoundaryPattern(aliases),
    ...buildDomainPattern(domains),
    ...buildBoundaryPattern(titleKeywords),
    ...(explicitRegex ? [explicitRegex] : []),
  ];

  return patterns.length > 0 ? patterns.join('|') : null;
}

function materializeRuleDefinition(definition: Rule): Rule {
  if (definition.type !== 'regex') {
    return _.cloneDeep(definition);
  }

  const regex = buildMaterializedRegex(definition);
  if (!regex) {
    return { type: 'none' };
  }

  return {
    type: 'regex',
    regex,
    ...(definition.ignore_case !== undefined
      ? { ignore_case: Boolean(definition.ignore_case) }
      : hasMatcherMetadata(definition)
        ? { ignore_case: true }
        : {}),
  };
}

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
  return JSON.stringify(
    rules.map(([categoryName, definition]) => [
      _.cloneDeep(categoryName),
      materializeRuleDefinition(_.cloneDeep(definition)),
    ])
  ).replace(/\\\\/g, '\\');
}

export function compileQueryCategoryRules(rules: QueryCategoryRule[]): CompiledQueryCategoryRule[] {
  return rules
    .map(([categoryName, definition]) => [
      _.cloneDeep(categoryName),
      materializeRuleDefinition(_.cloneDeep(definition)),
    ] as QueryCategoryRule)
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
