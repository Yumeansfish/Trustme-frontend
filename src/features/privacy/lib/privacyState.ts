export type PrivacyState =
  | 'off'
  | 'degraded'
  | 'on'
  | 'not-connected';

export interface PrivacyStatusResponse {
  configured: boolean;
  state: PrivacyState;
  enabled: boolean;
  error: string;
}

export interface PrivacySwitchView {
  checked: boolean;
}

export const PRIVACY_INITIAL_REFRESH_INTERVAL_MS = 1000;
export const PRIVACY_BACKGROUND_REFRESH_INTERVAL_MS = 30_000;

const PRIVACY_STATES = new Set<PrivacyState>([
  'off',
  'degraded',
  'on',
  'not-connected',
]);

export function normalizePrivacyStatus(payload: unknown): PrivacyStatusResponse {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Privacy status response must be an object.');
  }

  const source = payload as Record<string, unknown>;
  if (
    typeof source.configured !== 'boolean' ||
    typeof source.enabled !== 'boolean' ||
    typeof source.error !== 'string'
  ) {
    throw new Error('Privacy status response has invalid flags.');
  }

  if (typeof source.state !== 'string' || !PRIVACY_STATES.has(source.state as PrivacyState)) {
    throw new Error('Privacy status response has an invalid state.');
  }
  const state = source.state as PrivacyState;

  const expectedEnabled = state === 'on';
  if (source.enabled !== expectedEnabled) {
    throw new Error('Privacy status response has an inconsistent enabled flag.');
  }

  return {
    configured: source.configured,
    state,
    enabled: source.enabled,
    error: source.error,
  };
}

export function privacySwitchView(status: PrivacyStatusResponse): PrivacySwitchView {
  return {
    checked: status.state === 'on',
  };
}

export function privacyStateIsUnavailable(state: PrivacyState): boolean {
  return state === 'not-connected';
}

export function privacySwitchIsUnavailable(
  status: Pick<PrivacyStatusResponse, 'configured' | 'state'>
): boolean {
  return !status.configured || privacyStateIsUnavailable(status.state);
}

export function privacySwitchIsDisabled(
  status: Pick<PrivacyStatusResponse, 'configured' | 'state'>,
  saving: boolean
): boolean {
  return saving || privacySwitchIsUnavailable(status);
}

export function privacyProgressIsVisible(saving: boolean): boolean {
  return saving;
}

export function privacyRefreshIntervalMs(
  status: Pick<PrivacyStatusResponse, 'state' | 'error'>
): number {
  return status.state === 'not-connected' && status.error === ''
    ? PRIVACY_INITIAL_REFRESH_INTERVAL_MS
    : PRIVACY_BACKGROUND_REFRESH_INTERVAL_MS;
}
