import { getClient } from '~/app/lib/awclient';
import { abortableRequestConfig, isRequestAbortError } from '~/shared/lib/httpRequest';
import type { ActivityScopeResponse } from '~/shared/contracts/scope.generated';

const ACTIVITY_SCOPE_ENDPOINT = '/0/dashboard/scope';

function ensureStringList(values: unknown): string[] {
  if (!Array.isArray(values) || !values.every(value => typeof value === 'string')) {
    throw new Error('Invalid activity scope list');
  }
  return [...values];
}

function ensureString(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid activity scope value');
  return value;
}

export async function fetchActivityScope(signal?: AbortSignal): Promise<ActivityScopeResponse | null> {
  let response;
  try {
    response = await getClient().req.post(
      ACTIVITY_SCOPE_ENDPOINT,
      {},
      abortableRequestConfig(signal)
    );
  } catch (error) {
    if (isRequestAbortError(error)) throw error;
    console.warn('Activity scope endpoint unavailable', error);
    return null;
  }
  return {
    group_name: ensureString(response.data?.group_name),
    resolved_hosts: ensureStringList(response.data?.resolved_hosts),
    window_buckets: ensureStringList(response.data?.window_buckets),
    afk_buckets: ensureStringList(response.data?.afk_buckets),
    browser_buckets: ensureStringList(response.data?.browser_buckets),
    stopwatch_buckets: ensureStringList(response.data?.stopwatch_buckets),
    available_dates: ensureStringList(response.data?.available_dates),
    earliest_available_date:
      ensureString(response.data?.earliest_available_date),
    latest_available_date:
      ensureString(response.data?.latest_available_date),
  };
}
