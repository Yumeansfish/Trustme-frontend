export interface RemoteSettings {
  sshTarget: string;
  setupDir: string;
  participantName: string;
  reviewSyncStartDate: string;
}

export type RemoteSettingsField = keyof RemoteSettings;

export interface RemoteSettingsValidation {
  configured: boolean;
  valid: boolean;
  errors: Partial<Record<RemoteSettingsField, string>>;
}

export function createDefaultRemoteSettings(): RemoteSettings {
  return {
    sshTarget: '',
    setupDir: '~/trust-me-setup',
    participantName: '',
    reviewSyncStartDate: '',
  };
}

export function normalizeRemoteSettings(value: unknown): RemoteSettings {
  const defaults = createDefaultRemoteSettings();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults;
  }

  const source = value as Partial<Record<RemoteSettingsField, unknown>>;
  return {
    sshTarget: normalizeString(source.sshTarget, defaults.sshTarget),
    setupDir: normalizeString(source.setupDir, defaults.setupDir),
    participantName: normalizeString(source.participantName, defaults.participantName),
    reviewSyncStartDate: normalizeString(
      source.reviewSyncStartDate,
      defaults.reviewSyncStartDate
    ),
  };
}

export function prepareRemoteSettings(value: RemoteSettings): RemoteSettings {
  return {
    sshTarget: value.sshTarget.trim(),
    setupDir: value.setupDir.trim(),
    participantName: value.participantName.trim(),
    reviewSyncStartDate: value.reviewSyncStartDate.trim(),
  };
}

export function validateRemoteSettings(value: RemoteSettings): RemoteSettingsValidation {
  const remote = prepareRemoteSettings(value);
  const configured = Boolean(remote.sshTarget && remote.setupDir && remote.participantName);
  const errors: Partial<Record<RemoteSettingsField, string>> = {};

  if (
    remote.sshTarget &&
    (remote.sshTarget.startsWith('-') ||
      [...remote.sshTarget].some(
        character => /\s/.test(character) || isControlCharacter(character)
      ))
  ) {
    errors.sshTarget = 'Use one SSH host or alias without spaces.';
  }

  if (!remote.setupDir) {
    errors.setupDir = 'Enter the Trust-me setup directory.';
  } else if (
    !(
      remote.setupDir === '~' ||
      remote.setupDir.startsWith('~/') ||
      remote.setupDir.startsWith('/')
    ) ||
    [...remote.setupDir].some(isControlCharacter)
  ) {
    errors.setupDir = 'Use ~, a path below ~/, or an absolute path.';
  }

  if (remote.sshTarget && !remote.participantName) {
    errors.participantName = 'Enter the participant name.';
  } else if (
    remote.participantName &&
    (remote.participantName === '.' ||
      remote.participantName === '..' ||
      /[_/\\]/.test(remote.participantName) ||
      [...remote.participantName].some(isControlCharacter))
  ) {
    errors.participantName = 'Do not use underscores, slashes, or control characters.';
  }

  if (remote.reviewSyncStartDate && !isIsoCalendarDate(remote.reviewSyncStartDate)) {
    errors.reviewSyncStartDate = 'Use a valid date.';
  }

  return {
    configured,
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function prepareRemoteSettingsForSave(
  value: RemoteSettings,
  savedValue: RemoteSettings
): RemoteSettings {
  const remote = prepareRemoteSettings(value);
  const savedRemote = prepareRemoteSettings(savedValue);
  if (savedRemote.participantName) {
    remote.participantName = savedRemote.participantName;
  }
  return remote;
}

export function remoteSettingsEqual(left: RemoteSettings, right: RemoteSettings): boolean {
  const normalizedLeft = prepareRemoteSettings(left);
  const normalizedRight = prepareRemoteSettings(right);
  return (Object.keys(normalizedLeft) as RemoteSettingsField[]).every(
    key => normalizedLeft[key] === normalizedRight[key]
  );
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function isControlCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint < 32 || codePoint === 127;
}

function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}
