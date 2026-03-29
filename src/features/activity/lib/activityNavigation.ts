import moment from 'moment';
import {
  normalizeCustomDateRange,
  normalizeDateForPeriod,
} from '~/features/activity/lib/activityRouteState';

interface ViewLike {
  id: string;
}

interface RouteLike {
  name?: string | symbol | null;
  query: Record<string, unknown>;
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

export function serializeRouteQuery(query: Record<string, unknown>): string {
  return new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(entry => [key, String(entry)] as [string, string]);
      }
      if (value == null) {
        return [];
      }
      return [[key, String(value)] as [string, string]];
    })
  ).toString();
}

export function readCategoryFilter(query: Record<string, unknown>): string[] | null {
  const raw = query.category;
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  return raw.split('>');
}

export function writeCategoryFilterQuery(
  query: Record<string, unknown>,
  value: string[] | null
): Record<string, unknown> {
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

export function buildCalendarSelectionHash({
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
  const normalizedDate = normalizeDateForPeriod(date, 'day', startOfWeek);
  const encodedHost = encodeURIComponent(host);
  const encodedViewId = activeViewId ? `/${encodeURIComponent(activeViewId)}` : '';
  const queryString = serializeRouteQuery(query);
  const path = `/activity/${encodedHost}/day/${normalizedDate}/view${encodedViewId}`;
  return queryString ? `#${path}?${queryString}` : `#${path}`;
}

export function normalizeDateSelection(
  date: string,
  periodLength: string,
  normalizedPeriodLength: string,
  startOfWeek: string
): { date: string; periodLength: string } | null {
  const nextPeriodLength = periodLength || normalizedPeriodLength;
  const momentDate = moment(date, 'YYYY-MM-DD', true);
  if (!momentDate.isValid()) {
    return null;
  }

  return {
    periodLength: nextPeriodLength,
    date: normalizeDateForPeriod(momentDate.format('YYYY-MM-DD'), nextPeriodLength, startOfWeek),
  };
}

export function buildActivityRouteDescriptor({
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
}): {
  name: 'activity-view' | 'activity-custom-view';
  params: Record<string, string>;
  query: Record<string, unknown>;
} {
  if (periodLength === 'custom') {
    const normalizedRange = normalizeCustomDateRange(date, endDate);
    const params: Record<string, string> = {
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

  const normalizedRouteDate = normalizeDateForPeriod(date, periodLength, startOfWeek);
  const params: Record<string, string> = {
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
  params: Record<string, unknown>;
  query: Record<string, unknown>;
} {
  return {
    name: route.name === 'activity-custom-view' ? 'activity-custom-view' : 'activity-view',
    params: { ...route.params, view_id: viewId },
    query: route.query,
  };
}
