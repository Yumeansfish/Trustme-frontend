import * as _ from 'lodash';
import type { IEvent } from '~/shared/lib/interfaces';

import { useCategoryStore } from '~/features/categorization/store/categories';
import { getColorFromString } from '~/features/categorization/lib/color';

import type { CategoryPeriodData } from './activityTypes';
import { ensureEventList } from './activityData';

export function normalizeCategory(category: unknown): string[] {
  if (Array.isArray(category) && category.length > 0) {
    return category.map(part => String(part));
  }
  if (typeof category === 'string' && category.length > 0) {
    return [category];
  }
  return ['Uncategorized'];
}

export function colorCategories(events: IEvent[]): IEvent[] {
  const categoryStore = useCategoryStore();
  return events.map((event: IEvent) => {
    const category = normalizeCategory(event.data?.['$category']);
    event.data['$color'] = categoryStore.classes.some(c => _.isEqual(c.name, category))
      ? categoryStore.get_category_color(category)
      : getColorFromString(category.join(' > '));
    return event;
  });
}

export function ensureByPeriod(by_period: unknown): CategoryPeriodData {
  if (!by_period || typeof by_period !== 'object' || Array.isArray(by_period)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(by_period as Record<string, unknown>).map(([key, value]) => {
      const cat_events =
        value && typeof value === 'object' && !Array.isArray(value)
          ? ensureEventList((value as { cat_events?: unknown }).cat_events)
          : [];

      return [key, { cat_events }];
    })
  );
}
