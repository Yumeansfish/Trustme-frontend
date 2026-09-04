// This file is generated. Do not edit it by hand.
// Source: backend/src/review/review_dto.py via scripts/sync_frontend_contracts.py

export interface ReviewHighlight {
  id: string;
  filename: string;
  date: string;
  recorded_at: string;
  video_url: string;
}
export interface ReviewResponse {
  available_dates: string[];
  highlights: ReviewHighlight[];
}
