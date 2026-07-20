import { ensureEventList } from '~/shared/lib/activitywatchData';

import type { CategoryPeriodData } from './summaryTypes';

export function ensureByPeriod(byPeriod: unknown): CategoryPeriodData {
  if (!byPeriod || typeof byPeriod !== 'object' || Array.isArray(byPeriod)) {
    throw new Error('Invalid summary periods');
  }
  return Object.fromEntries(
    Object.entries(byPeriod).map(([key, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Invalid summary period');
      }
      return [key, { cat_events: ensureEventList(value.cat_events) }];
    })
  );
}
