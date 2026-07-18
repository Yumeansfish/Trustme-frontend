import type { RouteLocationNormalizedLoaded } from 'vue-router';

import {
  preloadActivityViewComponents,
} from '~/features/activity/lib/layout/activityComponentPreload';
export function shouldPreloadActivityRoute(route: RouteLocationNormalizedLoaded): boolean {
  return route.matched.some(record => record.meta.preloadActivitySummary === true);
}

export function preloadInitialActivityRoute(
  route: RouteLocationNormalizedLoaded
): Promise<Array<PromiseSettledResult<unknown>>> | null {
  if (!shouldPreloadActivityRoute(route)) {
    return null;
  }

  return preloadActivityViewComponents();
}
