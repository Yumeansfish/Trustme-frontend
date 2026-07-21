import {
  normalizePrivacyStatus,
  PRIVACY_BACKGROUND_REFRESH_INTERVAL_MS,
  PRIVACY_INITIAL_REFRESH_INTERVAL_MS,
  privacyProgressIsVisible,
  privacyRefreshIntervalMs,
  privacyStateIsUnavailable,
  privacySwitchIsDisabled,
  privacySwitchIsUnavailable,
  privacySwitchView,
  type PrivacyState,
} from '~/features/privacy/lib/privacyState';

describe('privacy state', () => {
  test.each([
    ['off', false],
    ['degraded', false],
    ['on', true],
    ['not-connected', false],
  ] as Array<[PrivacyState, boolean]>)('maps %s to checked=%s', (state, checked) => {
    expect(
      privacySwitchView({ configured: true, state, enabled: checked, error: '' })
    ).toEqual({ checked });
  });

  test.each([
    ['off', false],
    ['degraded', false],
    ['on', false],
    ['not-connected', true],
  ] as Array<[PrivacyState, boolean]>)('maps %s to unavailable=%s', (state, unavailable) => {
    expect(privacyStateIsUnavailable(state)).toBe(unavailable);
  });

  test.each([
    [{ configured: true, state: 'not-connected' }, true],
    [{ configured: false, state: 'off' }, true],
    [{ configured: true, state: 'off' }, false],
    [{ configured: true, state: 'degraded' }, false],
    [{ configured: true, state: 'on' }, false],
  ] as Array<[{ configured: boolean; state: PrivacyState }, boolean]>) (
    'maps %j to unavailable=%s',
    (status, unavailable) => {
      expect(privacySwitchIsUnavailable(status)).toBe(unavailable);
    }
  );

  test.each([
    ['not-connected', true],
    ['off', false],
    ['degraded', false],
    ['on', false],
  ] as Array<[PrivacyState, boolean]>)('maps %s to disabled=%s', (state, disabled) => {
    expect(privacySwitchIsDisabled({ configured: true, state }, false)).toBe(disabled);
  });

  test('disables the switch only while saving or unavailable', () => {
    expect(privacySwitchIsDisabled({ configured: true, state: 'on' }, true)).toBe(true);
    expect(privacySwitchIsDisabled({ configured: false, state: 'off' }, false)).toBe(true);
    expect(privacyProgressIsVisible(false)).toBe(false);
    expect(privacyProgressIsVisible(true)).toBe(true);
  });

  test('rechecks a cold cache quickly and otherwise refreshes in the background', () => {
    expect(privacyRefreshIntervalMs({ state: 'not-connected', error: '' })).toBe(
      PRIVACY_INITIAL_REFRESH_INTERVAL_MS
    );
    expect(privacyRefreshIntervalMs({ state: 'not-connected', error: 'SSH failed' })).toBe(
      PRIVACY_BACKGROUND_REFRESH_INTERVAL_MS
    );
    expect(privacyRefreshIntervalMs({ state: 'off', error: '' })).toBe(
      PRIVACY_BACKGROUND_REFRESH_INTERVAL_MS
    );
    expect(privacyRefreshIntervalMs({ state: 'degraded', error: 'Needs restart' })).toBe(
      PRIVACY_BACKGROUND_REFRESH_INTERVAL_MS
    );
    expect(privacyRefreshIntervalMs({ state: 'on', error: '' })).toBe(
      PRIVACY_BACKGROUND_REFRESH_INTERVAL_MS
    );
  });

  test.each([
    ['off', false, ''],
    ['degraded', false, 'Remote capture session needs restart'],
    ['on', true, ''],
    ['not-connected', false, 'SSH failed'],
  ] as Array<[PrivacyState, boolean, string]>)('accepts the %s contract', (state, enabled, error) => {
    expect(normalizePrivacyStatus({ configured: true, state, enabled, error })).toEqual({
      configured: true,
      state,
      enabled,
      error,
    });
  });

  test('treats degraded as an actionable off state', () => {
    const status = normalizePrivacyStatus({
      configured: true,
      state: 'degraded',
      enabled: false,
      error: 'Remote capture session needs restart',
    });

    expect(privacySwitchView(status)).toEqual({ checked: false });
    expect(privacySwitchIsDisabled(status, false)).toBe(false);
  });

  test('requires an explicit supported state', () => {
    expect(() => normalizePrivacyStatus({ configured: true, enabled: true, error: '' })).toThrow(
      'invalid state'
    );
    expect(() =>
      normalizePrivacyStatus({ configured: true, state: 'starting', enabled: true, error: '' })
    ).toThrow('invalid state');
  });

  test('rejects enabled values that conflict with the state', () => {
    expect(() =>
      normalizePrivacyStatus({ configured: true, state: 'on', enabled: false, error: '' })
    ).toThrow('inconsistent enabled');
    expect(() =>
      normalizePrivacyStatus({ configured: true, state: 'off', enabled: true, error: '' })
    ).toThrow('inconsistent enabled');
  });
});
