// This file is generated. Do not edit it by hand.
// Source: backend/src/model_output/model_output_dto.py via scripts/sync_frontend_contracts.py

export interface ModelOutputScale {
  min: number;
  max: number;
  min_label: string;
  max_label: string;
}
export interface ModelOutputCounterfactualShift {
  category: string;
  title: string;
  current_minutes: number;
  delta_minutes: number;
}
export interface ModelOutputCounterfactual {
  target: string;
  strength: string;
  shifts: ModelOutputCounterfactualShift[];
}
export interface ModelOutputResult {
  id: string;
  title: string;
  score: number;
  scale: ModelOutputScale;
  has_counterfactual: boolean;
}
export interface InsightConfirmationState {
  required_targets: string[];
  confirmed_targets: string[];
  feedback_available_at: string | null;
}
export interface ModelOutputReport {
  id: string;
  date: string;
  period_start: string;
  period_end: string;
  results: ModelOutputResult[];
  feedback_available_at: string | null;
  suggestions_available_at: string;
  checkin_session: string;
  confirmation?: InsightConfirmationState | null;
}
export interface ModelOutputResponse {
  available_dates: string[];
  reports: ModelOutputReport[];
}
