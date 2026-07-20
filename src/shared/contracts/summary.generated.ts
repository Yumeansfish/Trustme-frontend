// This file is generated. Do not edit it by hand.
// Source: backend/src/summary/summary_dto.py via scripts/sync_frontend_contracts.py

import type { AggregatedEvent } from './activitywatch.generated';

export interface SummaryWindow {
  app_events: AggregatedEvent[];
  cat_events: AggregatedEvent[];
  duration: number;
}
export interface SummaryByPeriodEntry {
  cat_events: AggregatedEvent[];
}
export interface SummaryResponse {
  window: SummaryWindow;
  by_period: Record<string, SummaryByPeriodEntry>;
}
