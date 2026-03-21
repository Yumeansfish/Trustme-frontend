import { createPinia, setActivePinia } from 'pinia';

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('~/app/lib/awclient', () => ({
  getClient: () => ({
    req: {
      get: mockGet,
      post: mockPost,
      defaults: { timeout: 0 },
    },
  }),
}));

import { useSettingsStore } from '~/features/settings/store/settings';

function createMockLocalStorage() {
  const storage = new Map<string, string>();

  return {
    getItem: jest.fn((key: string) => (storage.has(key) ? storage.get(key) ?? null : null)),
    setItem: jest.fn((key: string, value: string) => {
      storage.set(String(key), String(value));
    }),
    removeItem: jest.fn((key: string) => {
      storage.delete(String(key));
    }),
    clear: jest.fn(() => {
      storage.clear();
    }),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function settingsResponse(data: Record<string, unknown>) {
  return { data };
}

describe('settings store', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockGet.mockReset();
    mockPost.mockReset();

    Object.defineProperty(globalThis, 'localStorage', {
      value: createMockLocalStorage(),
      configurable: true,
      writable: true,
    });

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('theme updates persist only the changed setting', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.$patch({
      _loaded: true,
      theme: 'auto',
    });

    const serverSettings = JSON.parse(JSON.stringify(settingsStore.$state));
    delete serverSettings._loaded;
    serverSettings.theme = 'auto';

    const updatedServerSettings = {
      ...serverSettings,
      theme: 'dark',
    };

    mockGet
      .mockResolvedValueOnce(settingsResponse(serverSettings))
      .mockResolvedValueOnce(settingsResponse(updatedServerSettings));
    mockPost.mockResolvedValue(undefined);

    await settingsStore.update({ theme: 'dark' });

    const postedKeys = mockPost.mock.calls.map(([url]) => url);
    expect(postedKeys).toEqual(['/0/settings/theme']);
    expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  test('full save still persists all changed settings', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.$patch({
      _loaded: true,
      theme: 'dark',
      startOfWeek: 'Sunday',
    });

    const serverSettings = JSON.parse(JSON.stringify(settingsStore.$state));
    delete serverSettings._loaded;
    serverSettings.theme = 'auto';
    serverSettings.startOfWeek = 'Monday';

    const updatedServerSettings = {
      ...serverSettings,
      theme: 'dark',
      startOfWeek: 'Sunday',
    };

    mockGet
      .mockResolvedValueOnce(settingsResponse(serverSettings))
      .mockResolvedValueOnce(settingsResponse(updatedServerSettings));
    mockPost.mockResolvedValue(undefined);

    await settingsStore.save();

    const postedKeys = mockPost.mock.calls.map(([url]) => url);
    expect(postedKeys).toContain('/0/settings/theme');
    expect(postedKeys).toContain('/0/settings/startOfWeek');
  });

  test('load only backfills theme from localStorage', async () => {
    const settingsStore = useSettingsStore();
    globalThis.localStorage.setItem('theme', 'dark');
    globalThis.localStorage.setItem('landingpage', '/settings');
    globalThis.localStorage.setItem('deviceMappings', '{"work":["laptop"]}');

    mockGet.mockResolvedValue(settingsResponse({}));

    await settingsStore.load();

    expect(settingsStore.theme).toBe('dark');
    expect(settingsStore.$state).not.toHaveProperty('landingpage');
    expect(settingsStore.$state).not.toHaveProperty('deviceMappings');
  });

  test('load preserves structured category matcher fields from server settings', async () => {
    const settingsStore = useSettingsStore();

    mockGet.mockResolvedValue(
      settingsResponse({
        classes: [
          {
            name: ['Code'],
            rule: {
              type: 'regex',
              ignore_case: true,
              exact_apps: ['Code'],
              title_keywords: ['Review'],
            },
          },
        ],
      })
    );

    await settingsStore.load();

    expect(settingsStore.classes).toEqual([
      {
        name: ['Code'],
        rule: {
          type: 'regex',
          ignore_case: true,
          exact_apps: ['Code'],
          title_keywords: ['Review'],
        },
      },
    ]);
  });

  test('a reload from one update preserves a newer different-key update queued behind it', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.$patch({
      _loaded: true,
      theme: 'auto',
      startOfWeek: 'Monday',
    });

    const serverState: Record<string, unknown> = {
      theme: 'auto',
      startOfWeek: 'Monday',
      requestTimeout: 30,
    };
    const firstReloadStarted = createDeferred<void>();
    const releaseFirstReload = createDeferred<void>();
    const secondWriteStarted = createDeferred<void>();
    let getCall = 0;

    mockGet.mockImplementation(async () => {
      getCall += 1;
      const snapshot = JSON.parse(JSON.stringify(serverState));
      if (getCall === 2) {
        firstReloadStarted.resolve();
        await releaseFirstReload.promise;
      }
      if (getCall === 3) {
        secondWriteStarted.resolve();
      }
      return settingsResponse(snapshot);
    });
    mockPost.mockImplementation(async (url: string, value: unknown) => {
      const key = url.split('/').pop()!;
      serverState[key] = JSON.parse(JSON.stringify(value));
    });

    const firstUpdate = settingsStore.update({ theme: 'dark' });
    await firstReloadStarted.promise;

    // This optimistic patch lands while the first update's stale reload is in flight.
    const secondUpdate = settingsStore.update({ startOfWeek: 'Sunday' });
    expect(settingsStore.startOfWeek).toBe('Sunday');

    releaseFirstReload.resolve();
    await secondWriteStarted.promise;

    // The first reload completed, but the queued patch must still be visible.
    expect(settingsStore.theme).toBe('dark');
    expect(settingsStore.startOfWeek).toBe('Sunday');

    await Promise.all([firstUpdate, secondUpdate]);

    expect(mockPost.mock.calls.map(([url]) => url)).toEqual([
      '/0/settings/theme',
      '/0/settings/startOfWeek',
    ]);
    expect(serverState).toMatchObject({ theme: 'dark', startOfWeek: 'Sunday' });
    expect(settingsStore.$state).toMatchObject({ theme: 'dark', startOfWeek: 'Sunday' });
  });

  test('an older standalone load cannot overwrite a completed settings update', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.$patch({ _loaded: true, theme: 'auto' });

    const serverState: Record<string, unknown> = {
      theme: 'auto',
      startOfWeek: 'Monday',
      requestTimeout: 30,
    };
    const staleLoadStarted = createDeferred<void>();
    const releaseStaleLoad = createDeferred<void>();
    let getCall = 0;

    mockGet.mockImplementation(async () => {
      getCall += 1;
      const snapshot = JSON.parse(JSON.stringify(serverState));
      if (getCall === 1) {
        staleLoadStarted.resolve();
        await releaseStaleLoad.promise;
      }
      return settingsResponse(snapshot);
    });
    mockPost.mockImplementation(async (url: string, value: unknown) => {
      const key = url.split('/').pop()!;
      serverState[key] = JSON.parse(JSON.stringify(value));
    });

    const staleLoad = settingsStore.load();
    await staleLoadStarted.promise;

    await settingsStore.update({ theme: 'dark' });
    expect(serverState.theme).toBe('dark');
    expect(settingsStore.theme).toBe('dark');

    releaseStaleLoad.resolve();
    await staleLoad;

    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(settingsStore.theme).toBe('dark');
  });

  test('a newer standalone load wins over an older post-save reload', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.$patch({ _loaded: true, theme: 'auto' });

    const serverState: Record<string, unknown> = {
      theme: 'auto',
      startOfWeek: 'Monday',
      requestTimeout: 30,
    };
    const postSaveReloadStarted = createDeferred<void>();
    const releasePostSaveReload = createDeferred<void>();
    let getCall = 0;

    mockGet.mockImplementation(async () => {
      getCall += 1;
      const snapshot = JSON.parse(JSON.stringify(serverState));
      if (getCall === 2) {
        postSaveReloadStarted.resolve();
        await releasePostSaveReload.promise;
      }
      return settingsResponse(snapshot);
    });
    mockPost.mockImplementation(async (url: string, value: unknown) => {
      const key = url.split('/').pop()!;
      serverState[key] = JSON.parse(JSON.stringify(value));
    });

    const update = settingsStore.update({ theme: 'dark' });
    await postSaveReloadStarted.promise;

    // Simulate a newer server-authoritative value observed by an explicit refresh.
    serverState.theme = 'light';
    await settingsStore.load();
    expect(settingsStore.theme).toBe('light');

    releasePostSaveReload.resolve();
    await update;

    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(settingsStore.theme).toBe('light');
  });

  test('update persists a deep call-time snapshot of structured settings', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.$patch({ _loaded: true, classes: [] });

    const serverState: Record<string, unknown> = {
      classes: [],
      requestTimeout: 30,
    };
    const firstGetStarted = createDeferred<void>();
    const releaseFirstGet = createDeferred<void>();
    const postedValues: unknown[] = [];
    let getCall = 0;

    mockGet.mockImplementation(async () => {
      getCall += 1;
      const snapshot = JSON.parse(JSON.stringify(serverState));
      if (getCall === 1) {
        firstGetStarted.resolve();
        await releaseFirstGet.promise;
      }
      return settingsResponse(snapshot);
    });
    mockPost.mockImplementation(async (url: string, value: unknown) => {
      postedValues.push(JSON.parse(JSON.stringify(value)));
      const key = url.split('/').pop()!;
      serverState[key] = JSON.parse(JSON.stringify(value));
    });

    const classes = [{ name: ['Work'], rule: { type: 'regex' as const, regex: 'Code' } }];
    const update = settingsStore.update({ classes });
    await firstGetStarted.promise;

    classes[0].name.push('Coding');
    releaseFirstGet.resolve();
    await update;

    const expectedClasses = [{ name: ['Work'], rule: { type: 'regex', regex: 'Code' } }];
    expect(postedValues).toEqual([expectedClasses]);
    expect(serverState.classes).toEqual(expectedClasses);
    expect(settingsStore.classes).toEqual(expectedClasses);
  });

  test('an older successful load can recover when a newer overlapping load fails', async () => {
    const settingsStore = useSettingsStore();
    const firstLoadStarted = createDeferred<void>();
    const releaseFirstLoad = createDeferred<void>();
    let getCall = 0;

    mockGet.mockImplementation(async () => {
      getCall += 1;
      if (getCall === 1) {
        firstLoadStarted.resolve();
        await releaseFirstLoad.promise;
        return settingsResponse({ theme: 'dark', requestTimeout: 30 });
      }
      throw new Error('newer load failed');
    });

    const olderLoad = settingsStore.load();
    await firstLoadStarted.promise;
    await expect(settingsStore.load()).rejects.toThrow('newer load failed');

    releaseFirstLoad.resolve();
    await olderLoad;

    expect(settingsStore.loaded).toBe(true);
    expect(settingsStore.theme).toBe('dark');
  });

  test('a load started after persistence can recover from a failed post-save reload', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.$patch({ _loaded: true, theme: 'auto' });

    const internalReloadStarted = createDeferred<void>();
    const internalReload = createDeferred<ReturnType<typeof settingsResponse>>();
    const explicitLoadStarted = createDeferred<void>();
    const releaseExplicitLoad = createDeferred<void>();
    let getCall = 0;

    mockGet.mockImplementation(async () => {
      getCall += 1;
      if (getCall === 1) {
        return settingsResponse({ theme: 'auto', requestTimeout: 30 });
      }
      if (getCall === 2) {
        internalReloadStarted.resolve();
        return internalReload.promise;
      }

      explicitLoadStarted.resolve();
      await releaseExplicitLoad.promise;
      return settingsResponse({ theme: 'light', requestTimeout: 30 });
    });
    mockPost.mockResolvedValue(undefined);

    const update = settingsStore.update({ theme: 'dark' });
    const updateFailure = expect(update).rejects.toThrow('post-save reload failed');
    await internalReloadStarted.promise;

    const explicitLoad = settingsStore.load();
    await explicitLoadStarted.promise;

    internalReload.reject(new Error('post-save reload failed'));
    await updateFailure;

    releaseExplicitLoad.resolve();
    await explicitLoad;

    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(mockPost).toHaveBeenCalledWith(
      '/0/settings/theme',
      'dark',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
    );
    expect(settingsStore.theme).toBe('light');
  });

  test('a pre-write load cannot overwrite a partially committed failed update', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.$patch({
      _loaded: true,
      theme: 'auto',
      startOfWeek: 'Monday',
    });

    const serverState: Record<string, unknown> = {
      theme: 'auto',
      startOfWeek: 'Monday',
      requestTimeout: 30,
    };
    const persistGetStarted = createDeferred<void>();
    const releasePersistGet = createDeferred<void>();
    const staleLoadStarted = createDeferred<void>();
    const releaseStaleLoad = createDeferred<void>();
    let getCall = 0;
    let postCall = 0;

    mockGet.mockImplementation(async () => {
      getCall += 1;
      const snapshot = JSON.parse(JSON.stringify(serverState));
      if (getCall === 1) {
        persistGetStarted.resolve();
        await releasePersistGet.promise;
      } else if (getCall === 2) {
        staleLoadStarted.resolve();
        await releaseStaleLoad.promise;
      }
      return settingsResponse(snapshot);
    });
    mockPost.mockImplementation(async (url: string, value: unknown) => {
      postCall += 1;
      if (postCall === 2) {
        throw new Error('second key failed');
      }
      const key = url.split('/').pop()!;
      serverState[key] = JSON.parse(JSON.stringify(value));
    });

    const update = settingsStore.update({ theme: 'dark', startOfWeek: 'Sunday' });
    const updateFailure = expect(update).rejects.toThrow('second key failed');
    await persistGetStarted.promise;

    const staleLoad = settingsStore.load();
    await staleLoadStarted.promise;

    releasePersistGet.resolve();
    await updateFailure;
    expect(serverState).toMatchObject({ theme: 'dark', startOfWeek: 'Monday' });

    releaseStaleLoad.resolve();
    await staleLoad;

    expect(settingsStore.$state).toMatchObject({ theme: 'dark', startOfWeek: 'Sunday' });
  });

  test('a failed queued update does not prevent the next update from saving', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.$patch({
      _loaded: true,
      theme: 'auto',
      startOfWeek: 'Monday',
    });

    const serverState: Record<string, unknown> = {
      theme: 'auto',
      startOfWeek: 'Monday',
      requestTimeout: 30,
    };
    let postCall = 0;
    mockGet.mockImplementation(async () =>
      settingsResponse(JSON.parse(JSON.stringify(serverState)))
    );
    mockPost.mockImplementation(async (url: string, value: unknown) => {
      postCall += 1;
      if (postCall === 1) {
        throw new Error('first settings write failed');
      }
      const key = url.split('/').pop()!;
      serverState[key] = JSON.parse(JSON.stringify(value));
    });

    const firstUpdate = settingsStore.update({ theme: 'dark' });
    const firstFailure = expect(firstUpdate).rejects.toThrow('first settings write failed');
    const secondUpdate = settingsStore.update({ startOfWeek: 'Sunday' });

    await firstFailure;
    await expect(secondUpdate).resolves.toBeUndefined();

    expect(mockPost.mock.calls.map(([url]) => url)).toEqual([
      '/0/settings/theme',
      '/0/settings/startOfWeek',
    ]);
    expect(serverState).toMatchObject({ theme: 'auto', startOfWeek: 'Sunday' });
    expect(settingsStore.$state).toMatchObject({ theme: 'auto', startOfWeek: 'Sunday' });
  });

  test('load with save enabled completes without enqueueing itself behind its own work', async () => {
    const settingsStore = useSettingsStore();
    const serverState = JSON.parse(JSON.stringify(settingsStore.$state));
    delete serverState._loaded;

    mockGet.mockImplementation(async () =>
      settingsResponse(JSON.parse(JSON.stringify(serverState)))
    );
    mockPost.mockResolvedValue(undefined);

    await expect(settingsStore.load({ save: true })).resolves.toBeUndefined();

    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(mockPost).not.toHaveBeenCalled();
    expect(settingsStore.loaded).toBe(true);
  });
});
