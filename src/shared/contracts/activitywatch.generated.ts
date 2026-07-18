// This file is generated. Do not edit it by hand.
// Source: backend/src/utils/activitywatch_event_dto.py via scripts/sync_frontend_contracts.py

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
