// This file is generated. Do not edit it by hand.
// Source: backend/src/model_feedback/model_feedback_dto.py via scripts/sync_frontend_contracts.py

export interface ModelFeedbackDTO {
  date: string;
  period_id: string;
  target: string;
  tried_to_follow: boolean;
  helped: boolean | null;
  submitted_at: string;
}
export interface ModelFeedbackResponse {
  feedback: ModelFeedbackDTO | null;
}
export interface ModelFeedbackSubmission {
  date: string;
  period_id: string;
  target: string;
  tried_to_follow: boolean;
  helped: boolean | null;
}
