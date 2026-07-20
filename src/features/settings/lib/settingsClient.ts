import { getClient } from '~/app/lib/awclient';

export type SettingsRecord = Record<string, unknown>;

const SETTINGS_ENDPOINT = '/0/settings';

export function setServerRequestTimeout(seconds: number): void {
  getClient().req.defaults.timeout = seconds * 1000;
}

export async function fetchSettings(): Promise<SettingsRecord> {
  // Use the raw Axios instance so Activity-view cancellation cannot cancel settings I/O.
  const response = await getClient().req.get(SETTINGS_ENDPOINT);
  const payload = response?.data;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid settings response');
  }
  return payload as SettingsRecord;
}

export async function persistSetting(key: string, value: unknown): Promise<void> {
  await getClient().req.post(`${SETTINGS_ENDPOINT}/${key}`, value, {
    headers: { 'Content-Type': 'application/json' },
  });
}
