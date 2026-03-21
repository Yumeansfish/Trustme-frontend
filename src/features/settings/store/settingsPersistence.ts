import _ from 'lodash';

import { getClient } from '~/app/lib/awclient';

const LOCAL_FALLBACK_KEYS = new Set(['theme']);

type SettingsRecord = Record<string, unknown>;

function cloneSettingValue(value: unknown): unknown {
  if (value === undefined || value === null || typeof value !== 'object') {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function jsonEq(a: unknown, b: unknown) {
  const jsonA = JSON.parse(JSON.stringify(a));
  const jsonB = JSON.parse(JSON.stringify(b));
  return _.isEqual(jsonA, jsonB);
}

function isPrivateSettingsKey(key: string): boolean {
  return key.startsWith('_');
}

export function normalizeSaveKeys(state: SettingsRecord, keys?: string[]): string[] {
  const requestedKeys = Array.isArray(keys) && keys.length > 0 ? keys : Object.keys(state);
  return [...new Set(requestedKeys)].filter(key => !isPrivateSettingsKey(key));
}

export function snapshotSettingsSubset(state: SettingsRecord, keys?: string[]): SettingsRecord {
  return Object.fromEntries(
    normalizeSaveKeys(state, keys).map(key => [key, cloneSettingValue(state[key])])
  );
}

function persistSettingToLocalStorage(key: string, value: unknown) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  if (typeof value === 'object') {
    localStorage.setItem(key, JSON.stringify(value));
  } else {
    localStorage.setItem(key, String(value));
  }
}

function shouldPersistToLocalStorage(key: string): boolean {
  return LOCAL_FALLBACK_KEYS.has(key);
}

function filterServerBackedSettings(serverSettings: SettingsRecord): SettingsRecord {
  return Object.fromEntries(
    Object.entries(serverSettings).filter(([key]) => !isPrivateSettingsKey(key))
  );
}

function readLocalFallbackSettings(): Record<string, string> {
  if (typeof localStorage === 'undefined') {
    return {};
  }

  return [...LOCAL_FALLBACK_KEYS].reduce<Record<string, string>>((acc, key) => {
    const value = localStorage.getItem(key);
    if (value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

async function fetchServerSettings(): Promise<SettingsRecord> {
  const client = getClient();

  // AWClient's convenience methods all share its global AbortController. Settings
  // writes must survive Activity-view cancellation, so use the underlying Axios
  // instance without attaching that global signal.
  const response = await client.req.get('/0/settings');
  const payload = response?.data;
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as SettingsRecord)
    : {};
}

export async function loadServerBackedSettings(): Promise<SettingsRecord> {
  const serverSettings = await fetchServerSettings();
  const storage = filterServerBackedSettings(serverSettings);

  if (typeof localStorage === 'undefined') {
    return storage;
  }

  const localFallbacks = readLocalFallbackSettings();
  for (const [key, value] of Object.entries(localFallbacks)) {
    if (storage[key] === undefined) {
      storage[key] = value;
    }
  }

  return storage;
}

export async function persistSettingsSubset(state: SettingsRecord, keys?: string[]): Promise<void> {
  const saveToLocalStorage = false;
  const client = getClient();
  // Capture values before the first await. The Pinia state object is live and can
  // otherwise be changed by a later optimistic update while this request is pending.
  const snapshot = snapshotSettingsSubset(state, keys);
  const keysToSave = Object.keys(snapshot);

  if (keysToSave.length === 0) {
    return;
  }

  const serverSettings = await fetchServerSettings();

  for (const key of keysToSave) {
    const value = snapshot[key];

    if (saveToLocalStorage || shouldPersistToLocalStorage(key)) {
      persistSettingToLocalStorage(key, value);
    }

    if (serverSettings[key] === undefined || !jsonEq(serverSettings[key], value)) {
      if (serverSettings[key] === undefined && value === false) {
        continue;
      }

      await client.req.post('/0/settings/' + key, value, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }
}
