import moment from 'moment';
import {
  normalizeCustomDateRange,
  normalizeDateForPeriod,
} from '~/features/activity/lib/activityRouteState';
import type { LocationQueryRaw, RouteParamsRawGeneric } from 'vue-router';

interface ViewLike {
  id: string;
}

interface RouteLike {
  name?: string | symbol | null;
  query: LocationQueryRaw;
  params: Record<string, unknown>;
}

export function resolveActivityViewId(
  resolvedViews: ViewLike[],
  requestedViewId: string,
  fallbackViewId: string
): string {
  const hasRequestedView = resolvedViews.some(view => view.id === requestedViewId);
  return hasRequestedView ? requestedViewId : fallbackViewId;
}

export function readCategoryFilter(query: LocationQueryRaw): string[] | null {
  const raw = query.category;
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  return raw.split('>');
}

export function writeCategoryFilterQuery(
  query: LocationQueryRaw,
  value: string[] | null
): LocationQueryRaw {
  if (value == null) {
    const nextQuery = { ...query };
    delete nextQuery.category;
    return nextQuery;
  }
  return {
    ...query,
    category: value.join('>'),
  };
}

export function normalizeDateSelection(
  date: string,
  periodLength: string,
  normalizedPeriodLength: string
): { date: string; periodLength: string } | null {
  const nextPeriodLength = periodLength || normalizedPeriodLength;
  const momentDate = moment(date, 'YYYY-MM-DD', true);
  if (!momentDate.isValid()) {
    return null;
  }

  return {
    periodLength: nextPeriodLength,
    date: normalizeDateForPeriod(momentDate.format('YYYY-MM-DD'), nextPeriodLength),
  };
}

export function buildActivityRouteDescriptor({
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
}): {
  name: 'activity-view' | 'activity-custom-view';
  params: RouteParamsRawGeneric;
  query: LocationQueryRaw;
} {
  if (periodLength === 'custom') {
    const normalizedRange = normalizeCustomDateRange(date, endDate);
    const params: RouteParamsRawGeneric = {
      host,
      date: normalizedRange.start,
      end: normalizedRange.end,
      subview: subview || 'view',
    };

    const activeViewId = resolveActivityViewId(resolvedViews, requestedViewId, fallbackViewId);
    if (activeViewId) {
      params.view_id = activeViewId;
    }

    return {
      name: 'activity-custom-view',
      params,
      query,
    };
  }

  const normalizedRouteDate = normalizeDateForPeriod(date, periodLength);
  const params: RouteParamsRawGeneric = {
    host,
    periodLength,
    date: normalizedRouteDate,
    subview: subview || 'view',
  };

  const activeViewId = resolveActivityViewId(resolvedViews, requestedViewId, fallbackViewId);
  if (activeViewId) {
    params.view_id = activeViewId;
  }

  return {
    name: 'activity-view',
    params,
    query,
  };
}

export function buildViewTabRoute({ route, viewId }: { route: RouteLike; viewId: string }): {
  name: 'activity-view' | 'activity-custom-view';
  params: RouteParamsRawGeneric;
  query: LocationQueryRaw;
} {
  return {
    name: route.name === 'activity-custom-view' ? 'activity-custom-view' : 'activity-view',
    params: { ...route.params, view_id: viewId },
    query: route.query,
  };
}
