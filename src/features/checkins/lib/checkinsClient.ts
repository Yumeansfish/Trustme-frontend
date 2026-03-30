import { getClient } from '~/app/lib/awclient';
import type { CheckinsResponse } from '~/shared/contracts/checkins.generated';
import { API_ENDPOINTS } from '~/shared/api/endpoints';
import { normalizeAvailableDates } from '~/shared/navigation/dateAvailability';

export async function fetchCheckins(date?: string): Promise<CheckinsResponse> {
  const response = await getClient().req.get(API_ENDPOINTS.checkins.root, {
    params: date ? { date } : {},
  });
  const payload = response.data as Partial<CheckinsResponse>;
  return {
    available_dates: normalizeAvailableDates(payload.available_dates),
    sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
  };
}
