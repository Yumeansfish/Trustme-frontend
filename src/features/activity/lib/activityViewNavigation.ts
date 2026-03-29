import {
  buildActivityRouteDescriptor,
  buildCalendarSelectionHash,
  normalizeDateSelection,
} from '~/features/activity/lib/activityNavigation';

interface ViewLike {
  id: string;
}

interface RouteLike {
  fullPath: string;
  query: Record<string, unknown>;
}

interface RouterLike {
  resolve(route: ActivityRouteDescriptor): { fullPath: string };
  replace(route: ActivityRouteDescriptor): Promise<unknown>;
  push(route: ActivityRouteDescriptor): Promise<unknown> | void;
}

export interface ActivityRouteDescriptor {
  name: 'activity-view' | 'activity-custom-view';
  params: Record<string, string>;
  query: Record<string, unknown>;
}

export const ACTIVITY_REACTIVE_REFRESH_WATCHERS = Object.freeze({
  host: 'handleReactiveRefresh',
  timeperiod: 'handleReactiveRefresh',
  filter_category: 'handleReactiveRefresh',
  filter_afk: 'handleReactiveRefresh',
  include_audible: 'handleReactiveRefresh',
  currentViewId: 'handleReactiveRefresh',
});

export function resolveCurrentActivityView<T extends ViewLike>(
  resolvedViews: T[],
  requestedViewId: unknown
): T | undefined {
  if (typeof requestedViewId === 'string') {
    return resolvedViews.find(view => view.id === requestedViewId) || resolvedViews[0];
  }
  return resolvedViews[0];
}

export function resolveCurrentActivityViewId(currentView?: ViewLike | null): string {
  return currentView?.id || '';
}

export function buildResolvedActivityRoute({
  host,
  date,
  endDate,
  periodLength,
  startOfWeek,
  subview,
  query,
  requestedViewId,
  fallbackViewId,
  resolvedViews,
}: {
  host: string;
  date: string;
  endDate?: string;
  periodLength: string;
  startOfWeek: string;
  subview?: string;
  query: Record<string, unknown>;
  requestedViewId: string;
  fallbackViewId: string;
  resolvedViews: ViewLike[];
}): ActivityRouteDescriptor {
  return buildActivityRouteDescriptor({
    host,
    date,
    endDate,
    periodLength,
    startOfWeek,
    subview,
    query,
    requestedViewId,
    fallbackViewId,
    resolvedViews,
  });
}

export async function normalizeActivityRouteIfNeeded({
  router,
  route,
  expectedRoute,
}: {
  router: RouterLike;
  route: RouteLike;
  expectedRoute: ActivityRouteDescriptor;
}): Promise<boolean> {
  const expectedFullPath = router.resolve(expectedRoute).fullPath;

  if (route.fullPath === expectedFullPath) {
    return false;
  }

  await router.replace(expectedRoute);
  return true;
}

export function buildCalendarSelectionLocationHash({
  host,
  date,
  startOfWeek,
  activeViewId,
  query,
}: {
  host: string;
  date: string;
  startOfWeek: string;
  activeViewId: string;
  query: Record<string, unknown>;
}): string {
  return buildCalendarSelectionHash({
    host,
    date,
    startOfWeek,
    activeViewId,
    query,
  });
}

export function buildActivityDateSelectionRoute({
  date,
  periodLength,
  normalizedPeriodLength,
  startOfWeek,
  host,
  subview,
  query,
  requestedViewId,
  fallbackViewId,
  resolvedViews,
}: {
  date: string;
  periodLength: string;
  normalizedPeriodLength: string;
  startOfWeek: string;
  host: string;
  subview?: string;
  query: Record<string, unknown>;
  requestedViewId: string;
  fallbackViewId: string;
  resolvedViews: ViewLike[];
}): ActivityRouteDescriptor | null {
  const nextRouteState = normalizeDateSelection(
    date,
    periodLength,
    normalizedPeriodLength,
    startOfWeek
  );
  if (!nextRouteState) {
    return null;
  }

  return buildResolvedActivityRoute({
    host,
    date: nextRouteState.date,
    periodLength: nextRouteState.periodLength,
    startOfWeek,
    subview,
    query,
    requestedViewId,
    fallbackViewId,
    resolvedViews,
  });
}

export async function pushActivityRouteIfChanged({
  router,
  route,
  nextRoute,
}: {
  router: RouterLike;
  route: RouteLike;
  nextRoute: ActivityRouteDescriptor;
}): Promise<boolean> {
  if (route.fullPath === router.resolve(nextRoute).fullPath) {
    return false;
  }

  await router.push(nextRoute);
  return true;
}

export async function pushActivityRouteWithPendingState({
  router,
  route,
  nextRoute,
  startPending,
  stopPending,
}: {
  router: RouterLike;
  route: RouteLike;
  nextRoute: ActivityRouteDescriptor;
  startPending: () => void;
  stopPending: () => void;
}): Promise<boolean> {
  startPending();
  try {
    const changed = await pushActivityRouteIfChanged({ router, route, nextRoute });
    if (!changed) {
      stopPending();
    }
    return changed;
  } catch (error) {
    stopPending();
    throw error;
  }
}
