// This file is generated. Do not edit it by hand.
// Source: backend/src/daily_checkins/daily_checkin_dto.py via scripts/sync_frontend_contracts.py

export interface DailyCheckInDTO {
  checkin_date: string;
  checked_at: string;
  session: "morning" | "afternoon";
  inference_due_at: string | null;
  session_ends_at: string | null;
}
export interface DailyCheckInListDTO {
  checkins: DailyCheckInDTO[];
  current_date: string;
  current_session: "morning" | "afternoon";
  session_ends_at: string;
}
