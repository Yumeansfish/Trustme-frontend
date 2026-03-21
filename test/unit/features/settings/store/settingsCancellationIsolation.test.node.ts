import { createPinia, setActivePinia } from 'pinia';
import { AWClient } from 'aw-client';

let mockClient: AWClient;

jest.mock('~/app/lib/awclient', () => ({
  getClient: () => mockClient,
}));

import { useSettingsStore } from '~/features/settings/store/settings';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createMockLocalStorage() {
  const storage = new Map<string, string>();
  return {
    getItem: jest.fn((key: string) => storage.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => storage.set(String(key), String(value))),
    removeItem: jest.fn((key: string) => storage.delete(String(key))),
    clear: jest.fn(() => storage.clear()),
  };
}

describe('settings cancellation isolation', () => {
  test('global AWClient abort does not cancel a settings save or its reload', async () => {
    setActivePinia(createPinia());
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMockLocalStorage(),
      configurable: true,
      writable: true,
    });

    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const serverState: Record<string, unknown> = {
      theme: 'auto',
      startOfWeek: 'Monday',
      requestTimeout: 30,
    };
    const firstGetStarted = createDeferred<void>();
    const releaseFirstGet = createDeferred<void>();
    const requests: Array<{ method?: string; url?: string; hasSignal: boolean }> = [];
    let getCall = 0;

    mockClient = new AWClient('settings-cancellation-test', {
      testing: true,
      baseURL: 'http://127.0.0.1:5666',
    });
    mockClient.req.defaults.adapter = async config => {
      requests.push({
        method: config.method,
        url: config.url,
        hasSignal: Boolean(config.signal),
      });

      if (config.method === 'get') {
        getCall += 1;
        if (getCall === 1) {
          firstGetStarted.resolve();
          await releaseFirstGet.promise;
        }
        return {
          data: JSON.parse(JSON.stringify(serverState)),
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      if (config.method === 'post') {
        const key = config.url?.split('/').pop();
        const value = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        if (key) {
          serverState[key] = value;
        }
        return {
          data: null,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      throw new Error(`Unexpected request: ${config.method} ${config.url}`);
    };

    const settingsStore = useSettingsStore();
    settingsStore.$patch({ _loaded: true, theme: 'auto' });

    let settled = false;
    const updateOutcome = settingsStore.update({ theme: 'dark' }).then(
      () => {
        settled = true;
        return { status: 'fulfilled' as const, error: null };
      },
      error => {
        settled = true;
        return { status: 'rejected' as const, error };
      }
    );

    await firstGetStarted.promise;
    expect(requests).toEqual([{ method: 'get', url: '/0/settings', hasSignal: false }]);

    await mockClient.abort('unrelated Activity request canceled');
    await Promise.resolve();
    expect(settled).toBe(false);

    releaseFirstGet.resolve();
    const outcome = await updateOutcome;

    expect(outcome).toEqual({ status: 'fulfilled', error: null });
    expect(requests).toEqual([
      { method: 'get', url: '/0/settings', hasSignal: false },
      { method: 'post', url: '/0/settings/theme', hasSignal: false },
      { method: 'get', url: '/0/settings', hasSignal: false },
    ]);
    expect(serverState.theme).toBe('dark');
    expect(settingsStore.theme).toBe('dark');

    consoleInfoSpy.mockRestore();
  });
});
