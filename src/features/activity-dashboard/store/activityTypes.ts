import type { IEvent } from '~/shared/lib/interfaces';
import type { TimePeriod } from '~/app/lib/timeperiod';
import type {
  ActivityDetailsResponse,
  ActivityScopeResponse,
  SummarySnapshotResponse,
} from '~/shared/contracts/activity.generated';

export type ActivityPeriodMode = 'day' | 'week' | 'month' | 'year' | 'custom';

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
export type CategoryPeriodData = SummarySnapshotResponse['by_period'];

export interface WindowQueryResult {
  app_events?: IEvent[] | null;
  cat_events?: IEvent[] | null;
  duration?: number | null;
}

export interface BrowserQueryResult {
  domains?: IEvent[] | null;
  urls?: IEvent[] | null;
  titles?: IEvent[] | null;
}

export type DashboardSummarySnapshotResult = SummarySnapshotResponse;

export type DashboardDetailsResult = ActivityDetailsResponse;

export type DashboardResolvedScopeResult = ActivityScopeResponse;

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

export type ActivityDataPath = 'dashboard';

export interface ActivityDataNotice {
  variant: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  items: string[];
}

export interface ExecutionRange {
  start: Date;
  end: Date;
  period: string;
}

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
