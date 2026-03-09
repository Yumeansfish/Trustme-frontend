import type { IEvent } from '~/shared/lib/interfaces';
import type { Category } from '~/features/categorization/lib/classes';
import { embedTexts, type EmbeddingProgress } from './model';

export interface UncategorizedEventGroup {
  key: string;
  app: string;
  title: string;
  text: string;
  duration: number;
  count: number;
  events: IEvent[];
}

export interface CategorySuggestionCandidate {
  categoryName: string[];
  label: string;
  score: number;
}

export interface CategorySuggestion {
  group: UncategorizedEventGroup;
  candidates: CategorySuggestionCandidate[];
}

interface PreparedCategoryCandidate {
  categoryName: string[];
  label: string;
  text: string;
}

interface EmbeddedCategoryCandidate extends PreparedCategoryCandidate {
  embedding: number[];
}

const categoryEmbeddingCache = new Map<string, Promise<EmbeddedCategoryCandidate[]>>();
const eventEmbeddingCache = new Map<string, Promise<number[]>>();

function normalizeFreeText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeRegexHints(regex: string | undefined): string[] {
  if (!regex) {
    return [];
  }

  return regex
    .split('|')
    .map(part =>
      part
        .replace(/\\(.)/g, '$1')
        .replace(/\(\?[a-z]+\)/gi, ' ')
        .replace(/[\^\$\.\*\+\?\(\)\[\]\{\}]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .slice(0, 8);
}

function buildCategoryPrototypeText(category: Category): string {
  const categoryLabel = category.name.join(' > ');
  const hints = normalizeRegexHints(category.rule.regex);
  const parts = [`Category: ${categoryLabel}`];

  if (hints.length > 0) {
    parts.push(`Known matches: ${hints.join(', ')}`);
  }

  return parts.join('. ');
}

function buildCategorySignature(categories: Category[]): string {
  return categories
    .filter(category => category.name[0] !== 'Uncategorized')
    .map(category => `${category.name.join('>')}::${buildCategoryPrototypeText(category)}`)
    .join('||');
}

function buildEventGroupText(app: string, title: string): string {
  const parts: string[] = [];
  if (app) {
    parts.push(`Application: ${app}`);
  }
  if (title) {
    parts.push(`Window title: ${title}`);
  }
  return parts.join('. ');
}

function dotProduct(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let total = 0;

  for (let index = 0; index < length; index += 1) {
    total += left[index] * right[index];
  }

  return total;
}

async function getEmbeddedCategories(
  categories: Category[],
  onModelProgress?: (progress: EmbeddingProgress) => void
): Promise<EmbeddedCategoryCandidate[]> {
  const categorySignature = buildCategorySignature(categories);

  if (!categoryEmbeddingCache.has(categorySignature)) {
    categoryEmbeddingCache.set(
      categorySignature,
      (async () => {
        const preparedCategories: PreparedCategoryCandidate[] = categories
          .filter(category => category.name[0] !== 'Uncategorized')
          .map(category => ({
            categoryName: [...category.name],
            label: category.name.join(' > '),
            text: buildCategoryPrototypeText(category),
          }));

        const embeddings = await embedTexts(
          preparedCategories.map(category => category.text),
          onModelProgress
        );
        return preparedCategories.map((category, index) => ({
          ...category,
          embedding: embeddings[index] || [],
        }));
      })()
    );
  }

  return categoryEmbeddingCache.get(categorySignature) as Promise<EmbeddedCategoryCandidate[]>;
}

async function getEventEmbedding(text: string): Promise<number[]> {
  if (!eventEmbeddingCache.has(text)) {
    eventEmbeddingCache.set(
      text,
      (async () => {
        const embeddings = await embedTexts([text]);
        return embeddings[0] || [];
      })()
    );
  }

  return eventEmbeddingCache.get(text) as Promise<number[]>;
}

export function groupUncategorizedEvents(events: IEvent[]): UncategorizedEventGroup[] {
  const groupedEvents = new Map<string, UncategorizedEventGroup>();

  events.forEach(event => {
    const app = normalizeFreeText(event.data?.app);
    const title = normalizeFreeText(event.data?.title);
    const text = buildEventGroupText(app, title);

    if (!text) {
      return;
    }

    const key = `${app}||${title}`;
    const existingGroup = groupedEvents.get(key);

    if (existingGroup) {
      existingGroup.duration += event.duration || 0;
      existingGroup.count += 1;
      existingGroup.events.push(event);
      return;
    }

    groupedEvents.set(key, {
      key,
      app,
      title,
      text,
      duration: event.duration || 0,
      count: 1,
      events: [event],
    });
  });

  return [...groupedEvents.values()].sort((left, right) => right.duration - left.duration);
}

export async function suggestCategoriesForGroups(
  groups: UncategorizedEventGroup[],
  categories: Category[],
  {
    limit = 12,
    minScore = 0.35,
    onModelProgress,
  }: {
    limit?: number;
    minScore?: number;
    onModelProgress?: (progress: EmbeddingProgress) => void;
  } = {}
): Promise<CategorySuggestion[]> {
  if (groups.length === 0) {
    return [];
  }

  const embeddedCategories = await getEmbeddedCategories(categories, onModelProgress);

  const rankedSuggestions = await Promise.all(
    groups.slice(0, limit).map(async group => {
      const groupEmbedding = await getEventEmbedding(group.text);
      const candidates = embeddedCategories
        .map(category => ({
          categoryName: category.categoryName,
          label: category.label,
          score: dotProduct(groupEmbedding, category.embedding),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 3);

      if (candidates.length === 0 || candidates[0].score < minScore) {
        return null;
      }

      return {
        group,
        candidates,
      } satisfies CategorySuggestion;
    })
  );

  return rankedSuggestions.filter(
    (suggestion): suggestion is CategorySuggestion => suggestion !== null
  );
}
