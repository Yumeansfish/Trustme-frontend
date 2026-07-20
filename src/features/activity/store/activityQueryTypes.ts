import type { IEvent } from '~/shared/lib/interfaces';

import type {
  ActivityDataNotice,
  BrowserQueryResult,
  QueryOptions,
  State,
  WindowQueryResult,
} from './activityTypes';

export type CategoryByPeriodPayload = { by_period?: Record<string, { cat_events: IEvent[] }> };

export type BrowserQueryArgs = {
  includeBrowserData: boolean;
};

export interface ActivityQueryContext {
  scope: State['scope'];
  window: State['window'];
  buckets: State['buckets'];
  setActivityDataPath(mode: State['data_path']): void;
  setActivityDataNotice(notice: ActivityDataNotice | null): void;
  markActivityDataDegraded(dtoNames: string[]): void;
  isCurrentRequest(requestNonce: number): boolean;
  finish_loading(requestNonce: number): void;
  query_window_completed(data?: WindowQueryResult | null, requestNonce?: number): void;
  query_browser_completed(data?: BrowserQueryResult | null, requestNonce?: number): void;
  query_category_time_by_period_completed(
    payload?: CategoryByPeriodPayload,
    requestNonce?: number
  ): void;
}

export type ActivityViewQueryContext = ActivityQueryContext & {
  completeEmptyWindowData(queryOptions: QueryOptions, requestNonce: number): void;
  commitActivitySummary(
    queryOptions: QueryOptions,
    summary: import('./activityTypes').ActivitySummaryResult,
    requestNonce: number
  ): void;
  query_activity_browser(
    queryOptions: QueryOptions,
    requestNonce: number,
    args: BrowserQueryArgs,
    signal?: AbortSignal
  ): Promise<boolean>;
};
