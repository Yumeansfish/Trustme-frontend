import type { CheckinsResponse } from '~/shared/contracts/checkins.generated';
import {
  acceptCheckinsResponse,
  beginCheckinsRequest,
  canNavigateToCheckinDate,
  createCheckinsRequestState,
  finishCheckinsRequest,
  resolveCheckinsRedirectDate,
} from '~/features/checkins/lib/checkinsViewState';

function payload(date: string): CheckinsResponse {
  return {
    available_dates: [date],
    sessions: [],
  };
}

describe('Check-ins view state', () => {
  test('rejects unavailable navigation and redirects an unavailable route to latest', () => {
    const availableDates = ['2026-07-17', '2026-07-18'];

    expect(canNavigateToCheckinDate('2026-07-16', '2026-07-17', availableDates)).toBe(false);
    expect(canNavigateToCheckinDate('2026-07-18', '2026-07-17', availableDates)).toBe(true);
    expect(canNavigateToCheckinDate('2026-07-18', '2026-07-17', null)).toBe(false);
    expect(resolveCheckinsRedirectDate('2026-07-16', availableDates)).toBe('2026-07-18');
    expect(resolveCheckinsRedirectDate('2026-07-17', availableDates)).toBe('');
    expect(resolveCheckinsRedirectDate('2026-07-16', [])).toBe('');
  });

  test('does not let an older response overwrite or finish a newer request', () => {
    let state = createCheckinsRequestState();
    const requestA = beginCheckinsRequest(state);
    state = requestA.state;
    const requestB = beginCheckinsRequest(state);
    state = requestB.state;

    state = acceptCheckinsResponse(state, requestA.requestId, payload('A'));
    state = finishCheckinsRequest(state, requestA.requestId);

    expect(state.acceptedPayload).toBeNull();
    expect(state.loading).toBe(true);

    state = acceptCheckinsResponse(state, requestB.requestId, payload('B'));
    expect(state.acceptedPayload?.available_dates).toEqual(['B']);
    expect(state.loading).toBe(true);

    state = finishCheckinsRequest(state, requestB.requestId);
    expect(state.loading).toBe(false);
  });
});
