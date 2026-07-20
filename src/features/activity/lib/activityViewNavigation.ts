import {
  buildActivityRouteDescriptor,
  normalizeDateSelection,
} from '~/features/activity/lib/activityNavigation';
import type {
  LocationQueryRaw,
  RouteParamsRawGeneric,
  Router,
} from 'vue-router';

interface ViewLike {
  id: string;
}

interface RouteLike {
  fullPath: string;
  query: LocationQueryRaw;
}

type RouterLike = Pick<Router, 'resolve' | 'replace' | 'push'>;

export interface ActivityRouteDescriptor {
  name: 'activity-view' | 'activity-custom-view';
  params: RouteParamsRawGeneric;
  query: LocationQueryRaw;
}

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
  subview?: string;
  query: LocationQueryRaw;
  requestedViewId: string;
  fallbackViewId: string;
  resolvedViews: ViewLike[];
}): ActivityRouteDescriptor {
  return buildActivityRouteDescriptor({
    host,
    date,
    endDate,
    periodLength,
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

export function buildActivityDateSelectionRoute({
  date,
  periodLength,
  normalizedPeriodLength,
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
  host: string;
  subview?: string;
  query: LocationQueryRaw;
  requestedViewId: string;
  fallbackViewId: string;
  resolvedViews: ViewLike[];
}): ActivityRouteDescriptor | null {
  const nextRouteState = normalizeDateSelection(
    date,
    periodLength,
    normalizedPeriodLength
  );
  if (!nextRouteState) {
    return null;
  }

  return buildResolvedActivityRoute({
    host,
    date: nextRouteState.date,
    periodLength: nextRouteState.periodLength,
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
