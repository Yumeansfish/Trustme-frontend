import { cloneJson, deepEqual } from '~/shared/lib/objects';
import {
  fetchSettings,
  persistSetting,
  type SettingsRecord,
} from '~/features/settings/lib/settingsClient';

function isPrivateSettingsKey(key: string): boolean {
  return key.startsWith('_');
}

export function normalizeSaveKeys(state: SettingsRecord, keys?: string[]): string[] {
  const requestedKeys = Array.isArray(keys) && keys.length > 0 ? keys : Object.keys(state);
  return [...new Set(requestedKeys)].filter(key => !isPrivateSettingsKey(key));
}

export function snapshotSettingsSubset(state: SettingsRecord, keys?: string[]): SettingsRecord {
  return Object.fromEntries(
    normalizeSaveKeys(state, keys).map(key => [key, cloneJson(state[key])])
  );
}

function filterServerBackedSettings(serverSettings: SettingsRecord): SettingsRecord {
  return Object.fromEntries(
    Object.entries(serverSettings).filter(([key]) => !isPrivateSettingsKey(key))
  );
}

export async function loadServerBackedSettings(): Promise<SettingsRecord> {
  const serverSettings = await fetchSettings();
  const storage = filterServerBackedSettings(serverSettings);

  if (typeof localStorage === 'undefined') {
    return storage;
  }

  const theme = localStorage.getItem('theme');
  if (storage.theme === undefined && theme) storage.theme = theme;

  return storage;
}

export async function persistSettingsSubset(state: SettingsRecord, keys?: string[]): Promise<void> {
  // Capture values before the first await. The Pinia state object is live and can
  // otherwise be changed by a later optimistic update while this request is pending.
  const snapshot = snapshotSettingsSubset(state, keys);
  const keysToSave = Object.keys(snapshot);

  if (keysToSave.length === 0) {
    return;
  }

  const serverSettings = await fetchSettings();

  for (const key of keysToSave) {
    const value = snapshot[key];

    if (key === 'theme' && typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', String(value));
    }

    if (serverSettings[key] === undefined || !deepEqual(serverSettings[key], value)) {
      await persistSetting(key, value);
    }
  }
}
