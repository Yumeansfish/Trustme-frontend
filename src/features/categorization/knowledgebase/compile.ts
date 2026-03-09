import { CATEGORY_UNCATEGORIZED } from '~/features/categorization/lib/visualizationTokens';

export interface KnowledgebaseCategory {
  name: string;
  description?: string;
  exact_apps?: string[];
  aliases?: string[];
  domains?: string[];
  title_keywords?: string[];
  negative_indicators?: string[];
}

export interface KnowledgebaseDocument {
  version: number;
  categories: KnowledgebaseCategory[];
}

interface CompiledRule {
  type: 'regex' | 'none' | null;
  regex?: string;
  ignore_case?: boolean;
}

interface CompiledCategory {
  name: string[];
  rule: CompiledRule;
  data?: Record<string, unknown>;
}

const CATEGORY_METADATA: Record<string, { score?: number }> = {
  Code: { score: 10 },
  Design: { score: 8 },
  Writing: { score: 7 },
  Research: { score: 6 },
  Browsing: { score: 0 },
  Messaging: { score: 2 },
  Meetings: { score: 2 },
  Email: { score: 1 },
  Planning: { score: 6 },
  Gaming: { score: -8 },
  Video: { score: -4 },
  Music: { score: -2 },
  Shopping: { score: -3 },
  Finance: { score: 2 },
  System: { score: 0 },
  Miscellaneous: { score: 0 },
};

const CATEGORY_PRIORITY: Record<string, number> = {
  Email: 120,
  Meetings: 110,
  Messaging: 100,
  Code: 95,
  Design: 90,
  Writing: 85,
  Research: 80,
  Planning: 75,
  Finance: 70,
  Shopping: 65,
  Gaming: 60,
  Video: 55,
  Music: 50,
  System: 10,
  Browsing: 0,
  Miscellaneous: -10,
};

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTerms(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
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

function buildKnowledgebaseRegex(category: KnowledgebaseCategory): string | null {
  const exactApps = normalizeTerms(category.exact_apps);
  const aliases = normalizeTerms(category.aliases);
  const domains = normalizeTerms(category.domains);
  const titleKeywords = normalizeTerms(category.title_keywords);

  const patterns = [
    ...buildBoundaryPattern(exactApps),
    ...buildBoundaryPattern(aliases),
    ...buildDomainPattern(domains),
    ...buildBoundaryPattern(titleKeywords),
  ];

  if (patterns.length === 0) {
    return null;
  }

  return patterns.join('|');
}

function buildCategoryData(name: string): Record<string, unknown> | undefined {
  const metadata = CATEGORY_METADATA[name];
  if (!metadata) {
    return undefined;
  }

  const data: Record<string, unknown> = {};
  if (typeof metadata.score === 'number') {
    data.score = metadata.score;
  }

  return Object.keys(data).length > 0 ? data : undefined;
}

export function compileKnowledgebase(
  document: KnowledgebaseDocument,
  { includeMiscellaneous = true }: { includeMiscellaneous?: boolean } = {}
): CompiledCategory[] {
  const compiledCategories = document.categories
    .filter(category => includeMiscellaneous || category.name !== 'Miscellaneous')
    .slice()
    .sort((left, right) => (CATEGORY_PRIORITY[right.name] || 0) - (CATEGORY_PRIORITY[left.name] || 0))
    .map(category => {
      const regex = buildKnowledgebaseRegex(category);

      return {
        name: [category.name],
        rule: regex ? { type: 'regex', regex, ignore_case: true } : { type: 'none' },
        data: buildCategoryData(category.name),
      } satisfies CompiledCategory;
    });

  compiledCategories.push({
    name: ['Uncategorized'],
    rule: { type: null },
    data: { color: CATEGORY_UNCATEGORIZED },
  });

  return compiledCategories;
}
