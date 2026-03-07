// This file is generated. Do not edit it by hand.
// Source: backend/src/checkins/checkins_dto.py via scripts/contracts/export_checkins_contract_ts.py

export interface CheckinAnswer {
  question_id: string;
  label: string;
  status: string;
  value: number | null;
  value_label: string;
  progress: number | null;
}
export interface CheckinSession {
  id: string;
  date: string;
  started_at: string;
  ended_at: string;
  timeline_start: string;
  timeline_end: string;
  answers: CheckinAnswer[];
}
export interface CheckinsResponse {
  available_dates: string[];
  sessions: CheckinSession[];
}
