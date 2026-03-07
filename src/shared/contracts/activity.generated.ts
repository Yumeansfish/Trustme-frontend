// This file is generated. Do not edit it by hand.
// Source: backend/src/activity/activity_dto.py via scripts/contracts/export_activity_contract_ts.py

export interface EventData {
  app?: string;
  title?: string;
  subtitle?: string;
  matchText?: string;
  key?: string;
  status?: string;
  running?: boolean;
  value?: number;
  value_label?: string;
  emoji?: string;
  label?: string;
  progress?: number | null;
  question_id?: string;
  "$category"?: string[];
}
export interface AggregatedEvent {
  timestamp: string;
  duration: number;
  data: EventData;
}
export interface SummaryWindow {
  app_events: AggregatedEvent[];
  cat_events: AggregatedEvent[];
  duration: number;
}
export interface SummaryByPeriodEntry {
  cat_events: AggregatedEvent[];
}
export interface SummarySnapshotResponse {
  window: SummaryWindow;
  by_period: Record<string, SummaryByPeriodEntry>;
}
export interface BrowserSummaryResponse {
  domains: AggregatedEvent[];
  urls: AggregatedEvent[];
  titles: AggregatedEvent[];
}
export interface ActivityDetailsResponse {
  browser: BrowserSummaryResponse;
}
export interface ActivityScopeResponse {
  group_name: string;
  resolved_hosts: string[];
  window_buckets: string[];
  afk_buckets: string[];
  browser_buckets: string[];
  stopwatch_buckets: string[];
  available_dates: string[];
  earliest_available_date: string;
  latest_available_date: string;
}
export interface TimelineSegment {
  key: string;
  label: string;
  detail: string;
  category: string | null;
  source: string;
  start: string;
  end: string;
  clipped_start: boolean;
  clipped_end: boolean;
  variant: string;
}
export interface TimelineLane {
  event_count: number;
  segments: TimelineSegment[];
}
export interface TimelineResponse {
  range_start: string;
  range_end: string;
  status: TimelineLane;
  app_focus: TimelineLane;
}
