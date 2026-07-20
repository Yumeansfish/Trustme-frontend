import type { IEvent } from '~/shared/lib/interfaces';

import { colorCategories } from '~/features/categorization/lib/categoryEventData';
import type { BrowserQueryResult, State, WindowQueryResult } from './activityTypes';

export function completeWindowQuery(
  state: State,
  data: WindowQueryResult | null = null,
  requestNonce?: number
) {
  if (typeof requestNonce === 'number' && requestNonce !== state.active_request_nonce) return;
  const cat_events = colorCategories(data ? data.cat_events : []);

  state.window.duration = data ? data.duration : 0;
  state.window.top_apps = data ? [...data.app_events] : [];
  state.category.top = cat_events;
}

export function completeBrowserQuery(
  state: State,
  data: BrowserQueryResult | null = null,
  requestNonce?: number
) {
  if (typeof requestNonce === 'number' && requestNonce !== state.active_request_nonce) return;
  state.browser.top_domains = data ? [...data.domains] : [];
  state.browser.top_urls = data ? [...data.urls] : [];
  state.browser.top_titles = data ? [...data.titles] : [];
}

export function completeCategoryTimeByPeriodQuery(
  state: State,
  { by_period } = { by_period: {} as Record<string, { cat_events: IEvent[] }> },
  requestNonce?: number
) {
  if (typeof requestNonce === 'number' && requestNonce !== state.active_request_nonce) return;
  state.category.by_period = by_period;
}
