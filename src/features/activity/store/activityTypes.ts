import type { IEvent } from '~/shared/lib/interfaces';
import type { TimePeriod } from '~/app/lib/timeperiod';
import type { ActivityScopeResponse } from '~/shared/contracts/scope.generated';
import type { BrowserResponse } from '~/shared/contracts/browser.generated';
import type { SummaryResponse } from '~/shared/contracts/summary.generated';
import type { CategoryPeriodData, SummaryPeriodMode } from '~/features/summary/lib/summaryTypes';

export type ActivityPeriodMode = SummaryPeriodMode;

export type ActivityRefreshKind = 'silent' | 'soft' | 'hard' | null;

export interface QueryOptions {
  host: string;
  date?: string;
  timeperiod?: TimePeriod;
  period_mode?: ActivityPeriodMode;
  filter_afk?: boolean;
  include_audible?: boolean;
  filter_categories?: string[][];
  dont_query_inactive?: boolean;
  force?: boolean;
  always_active_pattern?: string;
  requested_visualizations?: string[];
}

export type MaybeLoadedList<T> = T[] | null;
export type { CategoryPeriodData } from '~/features/summary/lib/summaryTypes';

export type WindowQueryResult = SummaryResponse['window'];

export type BrowserQueryResult = BrowserResponse;

export type ActivitySummaryResult = SummaryResponse;

export type ActivityBrowserResult = BrowserResponse;

export type ActivityScopeResult = ActivityScopeResponse;

export interface ActivityScopeState {
  group_name: string;
  resolved_hosts: string[];
  /**
   * `null` means availability is loading, `undefined` means the scope API was
   * unavailable, and an array is an authoritative backend result.
   */
  available_dates: string[] | null | undefined;
  earliest_available_date: string;
  latest_available_date: string;
}

export type ActivityDataPath = 'activity';

export interface ActivityDataNotice {
  variant: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  items: string[];
}

export type ExecutionRange = import('~/shared/lib/timeRange').ExecutionRange;

export interface State {
  loaded: boolean;
  is_initial_loading: boolean;
  is_refreshing: boolean;
  refresh_kind: ActivityRefreshKind;
  request_nonce: number;
  active_request_nonce: number;
  data_path: ActivityDataPath | null;
  data_notice: ActivityDataNotice | null;

  window: {
    available: boolean;
    duration: number;
    top_apps: MaybeLoadedList<IEvent>;
  };

  browser: {
    available: boolean;
    top_urls: MaybeLoadedList<IEvent>;
    top_domains: MaybeLoadedList<IEvent>;
    top_titles: MaybeLoadedList<IEvent>;
  };

  editor: {
    available: boolean;
    duration: number;
    top_files: MaybeLoadedList<IEvent>;
    top_projects: MaybeLoadedList<IEvent>;
    top_languages: MaybeLoadedList<IEvent>;
  };

  category: {
    available: boolean;
    by_period: CategoryPeriodData | null;
    top: MaybeLoadedList<IEvent>;
  };

  query_options: QueryOptions | null;

  scope: ActivityScopeState;

  buckets: {
    loaded: boolean;
    afk: string[];
    window: string[];
    editor: string[];
    browser: string[];
  };
}
