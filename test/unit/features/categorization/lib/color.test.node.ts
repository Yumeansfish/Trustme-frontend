import type { Category } from '~/features/categorization/lib/classes';

import {
  getColorFromCategory,
  getColorFromString,
} from '~/features/categorization/lib/color';
import {
  CATEGORY_SCALE_PALETTE,
  CATEGORY_UNCATEGORIZED,
} from '~/features/categorization/lib/visualizationTokens';

describe('categorization color helpers', () => {
  test('maps strings to a stable palette color without d3', () => {
    const first = getColorFromString('Slack');
    const second = getColorFromString('slack');

    expect(first).toBe(second);
    expect(CATEGORY_SCALE_PALETTE).toContain(first);
  });

  test('maps categories to a stable palette color', () => {
    const category = { name: ['Work', 'Coding'] } as Category;

    expect(getColorFromCategory(category)).toBe(getColorFromCategory(category));
    expect(CATEGORY_SCALE_PALETTE).toContain(getColorFromCategory(category));
  });

  test('returns uncategorized color for uncategorized categories', () => {
    const category = { name: ['Uncategorized'] } as Category;

    expect(getColorFromCategory(category)).toBe(CATEGORY_UNCATEGORIZED);
  });
});
