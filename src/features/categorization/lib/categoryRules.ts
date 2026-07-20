import { cloneJson } from '~/shared/lib/objects';
import { hasMatcherMetadata, normalizeMatcherTerms, type Category, type Rule } from './classes';

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
    return cloneJson(definition);
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
  return categoryNames.reduce<string[] | null>(
    (deepest, categoryName) => (!deepest || categoryName.length > deepest.length ? categoryName : deepest),
    null
  );
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
    .map(category => [cloneJson(category.name), cloneJson(category.rule)] as QueryCategoryRule);
}

export function compileQueryCategoryRules(rules: QueryCategoryRule[]): CompiledQueryCategoryRule[] {
  return rules
    .map(([categoryName, definition]) => [
      cloneJson(categoryName),
      materializeRuleDefinition(cloneJson(definition)),
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
