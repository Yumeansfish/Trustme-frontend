// This file is generated. Do not edit it by hand.
// Source: backend/src/timeline/timeline_dto.py via scripts/sync_frontend_contracts.py

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
