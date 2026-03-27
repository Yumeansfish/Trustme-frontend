import axios from 'axios';

import { getClient, getClientAbortSignal } from '~/app/lib/awclient';
import { API_ENDPOINTS } from '~/shared/api/endpoints';

import type {
  DashboardDetailsResult,
  DashboardResolvedScopeResult,
  DashboardSummarySnapshotResult,
  ExecutionRange,
} from './activityTypes';
import { ensureByPeriod } from './activityCategoryData';
import { ensureDuration, ensureEventList } from './activityData';

function ensureStringList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean);
}

function isDashboardAbortError(error: unknown): boolean {
  if (axios.isCancel(error)) {
    return true;
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: string; name?: string; message?: string };
  const message = (maybeError.message || '').toLowerCase();
  return (
    maybeError.code === 'ERR_CANCELED' ||
    maybeError.name === 'CanceledError' ||
    maybeError.name === 'AbortError' ||
    message.includes('canceled') ||
    message.includes('aborted')
  );
}

function createAbortableRequestConfig() {
  const signal = getClientAbortSignal();
  return signal ? { signal } : undefined;
}

export async function fetchDashboardSummarySnapshot({
  range,
  categoryPeriods,
  filterAfk,
  filterCategories,
}: {
  range: ExecutionRange | null;
  categoryPeriods: string[];
  filterAfk: boolean | undefined;
  filterCategories: string[][] | undefined;
}): Promise<DashboardSummarySnapshotResult | null> {
  if (!range || categoryPeriods.length === 0) {
    return null;
  }

  try {
    const response = await getClient().req.post(
      API_ENDPOINTS.activity.summarySnapshot,
      {
        range: {
          start: range.start.toISOString(),
          end: range.end.toISOString(),
        },
        category_periods: categoryPeriods,
        filter_afk: Boolean(filterAfk),
        filter_categories: filterCategories || [],
      },
      createAbortableRequestConfig()
    );

    return {
      window: {
        app_events: ensureEventList(response.data?.window?.app_events),
        cat_events: ensureEventList(response.data?.window?.cat_events),
        duration: ensureDuration(response.data?.window?.duration),
      },
      by_period: ensureByPeriod(response.data?.by_period),
    };
  } catch (error) {
    if (isDashboardAbortError(error)) {
      throw error;
    }
    console.warn('Dashboard summary snapshot endpoint unavailable', error);
    return null;
  }
}

export async function fetchDashboardDetails({
  range,
}: {
  range: ExecutionRange | null;
}): Promise<DashboardDetailsResult | null> {
  if (!range) {
    return null;
  }

  try {
    const response = await getClient().req.post(
      API_ENDPOINTS.activity.details,
      {
        range: {
          start: range.start.toISOString(),
          end: range.end.toISOString(),
        },
      },
      createAbortableRequestConfig()
    );

    return {
      browser: {
        domains: ensureEventList(response.data?.browser?.domains),
        urls: ensureEventList(response.data?.browser?.urls),
        titles: ensureEventList(response.data?.browser?.titles),
      },
    };
  } catch (error) {
    if (isDashboardAbortError(error)) {
      throw error;
    }
    console.warn('Dashboard details endpoint unavailable', error);
    return null;
  }
}

export async function fetchDashboardResolvedScope(): Promise<DashboardResolvedScopeResult | null> {
  try {
    const response = await getClient().req.post(
      API_ENDPOINTS.activity.resolvedScope,
      {},
      createAbortableRequestConfig()
    );

    return {
      group_name: typeof response.data?.group_name === 'string' ? response.data.group_name : '',
      resolved_hosts: ensureStringList(response.data?.resolved_hosts),
      window_buckets: ensureStringList(response.data?.window_buckets),
      afk_buckets: ensureStringList(response.data?.afk_buckets),
      browser_buckets: ensureStringList(response.data?.browser_buckets),
      stopwatch_buckets: ensureStringList(response.data?.stopwatch_buckets),
      available_dates: ensureStringList(response.data?.available_dates),
      earliest_available_date:
        typeof response.data?.earliest_available_date === 'string'
          ? response.data.earliest_available_date
          : '',
      latest_available_date:
        typeof response.data?.latest_available_date === 'string'
          ? response.data.latest_available_date
          : '',
    };
  } catch (error) {
    if (isDashboardAbortError(error)) {
      throw error;
    }
    console.warn('Dashboard scope endpoint unavailable', error);
    return null;
  }
}
