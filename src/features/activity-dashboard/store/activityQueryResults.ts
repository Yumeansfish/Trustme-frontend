import type { IEvent } from '~/shared/lib/interfaces';

import { ensureEventList } from './activityData';
import { colorCategories, ensureByPeriod } from './activityCategoryData';
import type { BrowserQueryResult, State, WindowQueryResult } from './activityTypes';

export function completeWindowQuery(
  state: State,
  data: WindowQueryResult | null = null,
  requestNonce?: number
) {
  if (typeof requestNonce === 'number' && requestNonce !== state.active_request_nonce) return;
  const cat_events = colorCategories(ensureEventList(data?.cat_events));

  state.window.top_apps = ensureEventList(data?.app_events);
  state.category.top = cat_events;
}

export function completeBrowserQuery(
  state: State,
  data: BrowserQueryResult | null = null,
  requestNonce?: number
) {
  if (typeof requestNonce === 'number' && requestNonce !== state.active_request_nonce) return;
  state.browser.top_domains = ensureEventList(data?.domains);
  state.browser.top_urls = ensureEventList(data?.urls);
  state.browser.top_titles = ensureEventList(data?.titles);
}

export function completeCategoryTimeByPeriodQuery(
  state: State,
  { by_period } = { by_period: {} as Record<string, { cat_events: IEvent[] }> },
  requestNonce?: number
) {
  if (typeof requestNonce === 'number' && requestNonce !== state.active_request_nonce) return;
  state.category.by_period = ensureByPeriod(by_period);
}
