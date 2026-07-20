import type { IEvent } from '~/shared/lib/interfaces';
import { arraysEqual } from '~/shared/lib/objects';

import { useCategoryStore } from '~/features/categorization/store/categories';
import { getColorFromString } from '~/features/categorization/lib/color';

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
    event.data['$color'] = categoryStore.classes.some(c => arraysEqual(c.name, category))
      ? categoryStore.get_category_color(category)
      : getColorFromString(category.join(' > '));
    return event;
  });
}
