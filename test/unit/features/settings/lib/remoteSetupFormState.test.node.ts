import {
  remoteParticipantLocked,
  remoteSetupFieldsDisabled,
  remoteSetupSaveDisabled,
} from '~/features/settings/lib/remoteSetupFormState';

describe('remote setup form state', () => {
  test.each([
    { loading: true, saving: false, testingConnection: false },
    { loading: false, saving: true, testingConnection: false },
    { loading: false, saving: false, testingConnection: true },
  ])('disables fields while a remote form operation is active', state => {
    expect(remoteSetupFieldsDisabled(state)).toBe(true);
  });

  test('enables fields when the form is idle', () => {
    expect(
      remoteSetupFieldsDisabled({
        loading: false,
        saving: false,
        testingConnection: false,
      })
    ).toBe(false);
  });

  test('locks the participant after its first non-empty save', () => {
    expect(remoteParticipantLocked('')).toBe(false);
    expect(remoteParticipantLocked('  ')).toBe(false);
    expect(remoteParticipantLocked('Chengyu')).toBe(true);
  });

  test('disables save when the initial settings load failed', () => {
    expect(
      remoteSetupSaveDisabled({
        loaded: false,
        loading: false,
        saving: false,
        testingConnection: false,
        valid: true,
        dirty: true,
      })
    ).toBe(true);
  });

  test('enables save only for a loaded, valid, dirty, idle form', () => {
    expect(
      remoteSetupSaveDisabled({
        loaded: true,
        loading: false,
        saving: false,
        testingConnection: false,
        valid: true,
        dirty: true,
      })
    ).toBe(false);
  });
});
