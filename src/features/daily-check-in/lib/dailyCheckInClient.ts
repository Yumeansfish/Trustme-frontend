import { getClient } from '~/app/lib/awclient';
import type {
  DailyCheckInDTO,
  DailyCheckInListDTO,
} from '~/shared/contracts/daily-checkins.generated';
import type { InsightConfirmationState } from '~/shared/contracts/model-output.generated';

const DAILY_CHECK_INS_ENDPOINT = '/0/daily-check-ins';

export async function fetchDailyCheckIns(): Promise<DailyCheckInListDTO> {
  const response = await getClient().req.get(DAILY_CHECK_INS_ENDPOINT);
  return response.data as DailyCheckInListDTO;
}

export async function createDailyCheckIn(): Promise<DailyCheckInDTO> {
  const response = await getClient().req.post(DAILY_CHECK_INS_ENDPOINT);
  return response.data as DailyCheckInDTO;
}

export async function confirmInsight(date: string, periodId: string, target: string): Promise<InsightConfirmationState> {
  const response = await getClient().req.post(`${DAILY_CHECK_INS_ENDPOINT}/confirm`, {
    date, period_id: periodId, target,
  });
  return response.data as InsightConfirmationState;
}
