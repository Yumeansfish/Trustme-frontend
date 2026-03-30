import type { CheckinsResponse } from '~/shared/contracts/checkins.generated';
import { resolveLatestAvailableDate } from '~/shared/navigation/dateAvailability';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface CheckinsRequestState {
  latestRequestId: number;
  loading: boolean;
  acceptedPayload: CheckinsResponse | null;
}

export function createCheckinsRequestState(): CheckinsRequestState {
  return {
    latestRequestId: 0,
    loading: false,
    acceptedPayload: null,
  };
}

export function beginCheckinsRequest(state: CheckinsRequestState): {
  state: CheckinsRequestState;
  requestId: number;
} {
  const requestId = state.latestRequestId + 1;
  return {
    requestId,
    state: {
      latestRequestId: requestId,
      loading: true,
      acceptedPayload: null,
    },
  };
}

export function isCurrentCheckinsRequest(
  state: CheckinsRequestState,
  requestId: number
): boolean {
  return state.latestRequestId === requestId;
}

export function acceptCheckinsResponse(
  state: CheckinsRequestState,
  requestId: number,
  payload: CheckinsResponse
): CheckinsRequestState {
  if (!isCurrentCheckinsRequest(state, requestId)) return state;
  return {
    ...state,
    acceptedPayload: payload,
  };
}

export function finishCheckinsRequest(
  state: CheckinsRequestState,
  requestId: number
): CheckinsRequestState {
  if (!isCurrentCheckinsRequest(state, requestId)) return state;
  return {
    ...state,
    loading: false,
  };
}

export function canNavigateToCheckinDate(
  targetDate: string,
  selectedDate: string,
  availableDates: readonly string[] | null
): boolean {
  return (
    ISO_DATE_PATTERN.test(targetDate) &&
    targetDate !== selectedDate &&
    availableDates?.includes(targetDate) === true
  );
}

export function resolveCheckinsRedirectDate(
  requestedDate: string,
  availableDates: readonly string[]
): string {
  if (availableDates.length === 0 || availableDates.includes(requestedDate)) return '';
  return resolveLatestAvailableDate(availableDates);
}
