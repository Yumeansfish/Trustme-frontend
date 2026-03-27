import { defineStore } from 'pinia';

import { getClient } from '~/app/lib/awclient';
import { ensureActivityLoaded } from './activityCoordinator';
import {
  commitDashboardSnapshotResult,
  completeEmptyDashboardWindowData,
  queryDashboardDetailsResult,
  queryDashboardView,
} from './activityDashboardQueries';
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
import { buildDashboardDegradedNotice, formatActivityVisualizationType } from './activityNotices';
import { createInitialActivityState } from './activityState';
import type {
  ActivityDataNotice,
  BrowserQueryResult,
  DashboardSummarySnapshotResult,
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

    markDashboardDegraded(dtoNames: string[]) {
      this.setActivityDataPath('dashboard');
      this.setActivityDataNotice(buildDashboardDegradedNotice(dtoNames));
    },

    completeEmptyWindowData(query_options: QueryOptions, request_nonce: number) {
      return completeEmptyDashboardWindowData(this, query_options, request_nonce);
    },

    commitDashboardSnapshot(
      query_options: QueryOptions,
      dashboardSnapshot: DashboardSummarySnapshotResult,
      request_nonce: number
    ) {
      return commitDashboardSnapshotResult(this, query_options, dashboardSnapshot, request_nonce);
    },

    async query_dashboard_details(
      query_options: QueryOptions,
      request_nonce: number,
      { includeBrowserData }: { includeBrowserData: boolean }
    ) {
      return queryDashboardDetailsResult(this, query_options, request_nonce, {
        includeBrowserData,
      });
    },

    async query_dashboard_view(query_options: QueryOptions, request_nonce: number) {
      return queryDashboardView(this, query_options, request_nonce);
    },

    async ensure_loaded(query_options: QueryOptions) {
      return ensureActivityLoaded(this, query_options);
    },

    async reset() {
      await getClient().abort();
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
