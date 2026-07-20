import { defineStore } from 'pinia';

import { ensureActivityLoaded } from './activityCoordinator';
import { cancelActivityRequest } from './activityRequestCancellation';
import {
  commitActivitySummaryResult,
  completeEmptyActivityData,
  queryActivityBrowserResult,
  queryActivity,
} from './activityQueries';
import {
  finishActivityLoading,
  isAbortActivityError,
  isCurrentActivityRequest,
  resetActivityRuntimeState,
  startActivityLoading,
} from './activityRequestLifecycle';
import {
  completeBrowserQuery,
  completeCategoryTimeByPeriodQuery,
  completeWindowQuery,
} from './activityQueryResults';
import { buildActivityDataDegradedNotice, formatActivityVisualizationType } from './activityNotices';
import { createInitialActivityState } from './activityState';
import type {
  ActivityDataNotice,
  BrowserQueryResult,
  ActivitySummaryResult,
  QueryOptions,
  State,
  WindowQueryResult,
} from './activityTypes';

export type { QueryOptions } from './activityTypes';

export const useActivityStore = defineStore('activity', {
  state: createInitialActivityState,

  actions: {
    isAbortError(error: unknown) {
      return isAbortActivityError(error);
    },

    isCurrentRequest(this: State, request_nonce: number) {
      return isCurrentActivityRequest(this, request_nonce);
    },

    setActivityDataPath(this: State, mode: State['data_path']) {
      this.data_path = mode;
    },

    setActivityDataNotice(this: State, notice: ActivityDataNotice | null) {
      this.data_notice = notice;
    },

    formatVisualizationType(type: string) {
      return formatActivityVisualizationType(type);
    },

    markActivityDataDegraded(dtoNames: string[]) {
      this.setActivityDataPath('activity');
      this.setActivityDataNotice(buildActivityDataDegradedNotice(dtoNames));
    },

    completeEmptyWindowData(query_options: QueryOptions, request_nonce: number) {
      return completeEmptyActivityData(this, query_options, request_nonce);
    },

    commitActivitySummary(
      query_options: QueryOptions,
      summary: ActivitySummaryResult,
      request_nonce: number
    ) {
      return commitActivitySummaryResult(this, query_options, summary, request_nonce);
    },

    async query_activity_browser(
      query_options: QueryOptions,
      request_nonce: number,
      { includeBrowserData }: { includeBrowserData: boolean },
      signal?: AbortSignal
    ) {
      return queryActivityBrowserResult(this, query_options, request_nonce, {
        includeBrowserData,
      }, signal);
    },

    async query_activity(
      query_options: QueryOptions,
      request_nonce: number,
      signal?: AbortSignal
    ) {
      return queryActivity(this, query_options, request_nonce, signal);
    },

    async ensure_loaded(query_options: QueryOptions) {
      return ensureActivityLoaded(this, query_options);
    },

    reset() {
      cancelActivityRequest();
      resetActivityRuntimeState(this);
    },

    // mutations
    start_loading(this: State, query_options: QueryOptions) {
      return startActivityLoading(this, query_options);
    },

    finish_loading(this: State, request_nonce: number) {
      return finishActivityLoading(this, request_nonce);
    },

    query_window_completed(
      this: State,
      data: WindowQueryResult | null = null,
      request_nonce?: number
    ) {
      return completeWindowQuery(this, data, request_nonce);
    },

    query_browser_completed(
      this: State,
      data: BrowserQueryResult | null = null,
      request_nonce?: number
    ) {
      return completeBrowserQuery(this, data, request_nonce);
    },

    query_category_time_by_period_completed(
      this: State,
      { by_period } = { by_period: {} },
      request_nonce?: number
    ) {
      return completeCategoryTimeByPeriodQuery(this, { by_period }, request_nonce);
    },
  },
});
