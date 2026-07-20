import {
  createDefaultRemoteSettings,
  normalizeRemoteSettings,
  prepareRemoteSettings,
  prepareRemoteSettingsForSave,
  validateRemoteSettings,
} from '~/features/settings/lib/remoteSettings';

describe('remote settings', () => {
  test('treats an empty SSH target and empty identity as an unconfigured remote', () => {
    expect(validateRemoteSettings(createDefaultRemoteSettings())).toEqual({
      configured: false,
      valid: true,
      errors: {},
    });
  });

  test('still validates stored fields when the SSH target is empty', () => {
    const result = validateRemoteSettings({
      sshTarget: '',
      setupDir: 'relative/path',
      participantName: 'bad_name',
      reviewSyncStartDate: '2026-02-30',
    });

    expect(result).toEqual({
      configured: false,
      valid: false,
      errors: {
        setupDir: 'Use ~, a path below ~/, or an absolute path.',
        participantName: 'Do not use underscores, slashes, or control characters.',
        reviewSyncStartDate: 'Use a valid date.',
      },
    });
  });

  test('accepts one complete remote configuration', () => {
    expect(
      validateRemoteSettings({
        sshTarget: 'trust',
        setupDir: '~/trust-me-setup',
        participantName: 'Chengyu',
        reviewSyncStartDate: '2026-07-18',
      })
    ).toEqual({ configured: true, valid: true, errors: {} });
  });

  test('allows remote features without scheduled questionnaire sync', () => {
    expect(
      validateRemoteSettings({
        sshTarget: 'trust',
        setupDir: '~/trust-me-setup',
        participantName: 'Chengyu',
        reviewSyncStartDate: '',
      })
    ).toEqual({ configured: true, valid: true, errors: {} });
  });

  test('allows participant and questionnaire date to remain empty without an SSH target', () => {
    expect(
      validateRemoteSettings({
        sshTarget: '',
        setupDir: '~/trust-me-setup',
        participantName: '',
        reviewSyncStartDate: '',
      })
    ).toEqual({ configured: false, valid: true, errors: {} });
  });

  test('requires a participant when an SSH target is set', () => {
    expect(
      validateRemoteSettings({
        sshTarget: 'trust',
        setupDir: '~/trust-me-setup',
        participantName: '',
        reviewSyncStartDate: '',
      })
    ).toEqual({
      configured: false,
      valid: false,
      errors: { participantName: 'Enter the participant name.' },
    });
  });

  test('reports every invalid field after remote setup starts', () => {
    const result = validateRemoteSettings({
      sshTarget: '-bad target',
      setupDir: 'relative/path',
      participantName: 'bad_name',
      reviewSyncStartDate: '2026-02-30',
    });

    expect(result.configured).toBe(true);
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors)).toEqual([
      'sshTarget',
      'setupDir',
      'participantName',
      'reviewSyncStartDate',
    ]);
  });

  test('normalizes missing storage fields and trims values before saving', () => {
    expect(normalizeRemoteSettings({ sshTarget: 'trust' })).toEqual({
      sshTarget: 'trust',
      setupDir: '~/trust-me-setup',
      participantName: '',
      reviewSyncStartDate: '',
    });
    expect(
      prepareRemoteSettings({
        sshTarget: ' trust ',
        setupDir: ' ~/trust-me-setup ',
        participantName: ' Chengyu ',
        reviewSyncStartDate: ' 2026-07-18 ',
      })
    ).toEqual({
      sshTarget: 'trust',
      setupDir: '~/trust-me-setup',
      participantName: 'Chengyu',
      reviewSyncStartDate: '2026-07-18',
    });
  });

  test('preserves a saved participant identity when saving later changes', () => {
    const saved = {
      sshTarget: 'trust',
      setupDir: '~/trust-me-setup',
      participantName: 'Chengyu',
      reviewSyncStartDate: '2026-07-18',
    };

    expect(
      prepareRemoteSettingsForSave(
        {
          ...saved,
          sshTarget: '',
          participantName: '',
        },
        saved
      )
    ).toEqual({
      ...saved,
      sshTarget: '',
    });
  });
});
