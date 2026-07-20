// This file is generated. Do not edit it by hand.
// Source: backend/src/scope/activity_scope_dto.py via scripts/sync_frontend_contracts.py

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
