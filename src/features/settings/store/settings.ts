import { defineStore } from 'pinia';
import { getClient } from '~/app/lib/awclient';
import { Category } from '~/features/categorization/lib/classes';
import {
  loadServerBackedSettings,
  persistSettingsSubset,
  snapshotSettingsSubset,
} from './settingsPersistence';

interface State {
  startOfWeek: string;
  theme: 'light' | 'dark' | 'auto';

  always_active_pattern: string;
  classes: Category[];

  requestTimeout: number;

  // Set to true if settings loaded
  _loaded: boolean;
}

type SettingsPatch = Partial<State>;
type SettingsRecord = Record<string, unknown>;

type SettingsStoreRuntime = State & {
  $patch(mutator: (state: State) => void): void;
};

interface SettingsWriteQueue {
  tail: Promise<void>;
  nextId: number;
  pending: Map<
    number,
    {
      snapshot: SettingsRecord;
      persisted: boolean;
    }
  >;
  writeRevision: number;
  nextLoadId: number;
  latestAppliedLoadId: number;
}

interface SettingsLoadToken {
  loadId: number;
  writeRevision: number;
}

const settingsWriteQueues = new WeakMap<object, SettingsWriteQueue>();

function getSettingsWriteQueue(store: object): SettingsWriteQueue {
  let queue = settingsWriteQueues.get(store);
  if (!queue) {
    queue = {
      tail: Promise.resolve(),
      nextId: 0,
      pending: new Map(),
      writeRevision: 0,
      nextLoadId: 0,
      latestAppliedLoadId: 0,
    };
    settingsWriteQueues.set(store, queue);
  }
  return queue;
}

function getPendingSettingsPatches(store: object): Iterable<SettingsRecord> {
  const pendingWrites = settingsWriteQueues.get(store)?.pending.values();
  if (!pendingWrites) {
    return [];
  }
  return [...pendingWrites].filter(write => !write.persisted).map(write => write.snapshot);
}

function beginSettingsLoad(store: object): SettingsLoadToken {
  const queue = getSettingsWriteQueue(store);
  const loadId = ++queue.nextLoadId;
  return {
    loadId,
    writeRevision: queue.writeRevision,
  };
}

function claimSettingsLoad(store: object, token: SettingsLoadToken): boolean {
  const queue = getSettingsWriteQueue(store);
  if (queue.writeRevision !== token.writeRevision || token.loadId <= queue.latestAppliedLoadId) {
    return false;
  }

  queue.latestAppliedLoadId = token.loadId;
  return true;
}

function applyLoadedSettings(
  store: SettingsStoreRuntime,
  storage: SettingsRecord,
  pendingPatches: Iterable<SettingsRecord> = []
): void {
  store.$patch(state => {
    Object.assign(state, storage as SettingsPatch);
    for (const patch of pendingPatches) {
      Object.assign(state, patch as SettingsPatch);
    }
    state._loaded = true;
  });

  // `requestTimeout` is applied when the client is created, so the live client has to be
  // updated after settings load as well.
  getClient().req.defaults.timeout = store.requestTimeout * 1000;
}

function enqueueSettingsWrite(
  store: SettingsStoreRuntime,
  snapshot: SettingsRecord
): Promise<void> {
  if (Object.keys(snapshot).length === 0) {
    return Promise.resolve();
  }

  const queue = getSettingsWriteQueue(store);
  const writeId = ++queue.nextId;
  queue.writeRevision += 1;
  queue.pending.set(writeId, { snapshot, persisted: false });

  // Continue processing later writes even if an earlier caller observed a failed write.
  const previousWrite = queue.tail.catch(() => undefined);
  const currentWrite = previousWrite.then(async () => {
    let persistCompleted = false;
    try {
      await persistSettingsSubset(snapshot, Object.keys(snapshot));
      persistCompleted = true;
      // The write is now server-visible. Loads which started during the write must
      // not apply a pre-write snapshot after this point.
      const pendingWrite = queue.pending.get(writeId);
      if (pendingWrite) {
        pendingWrite.persisted = true;
      }
      queue.writeRevision += 1;

      const reloadToken = beginSettingsLoad(store);
      const storage = await loadServerBackedSettings();
      queue.pending.delete(writeId);
      // A reload from this write must not overwrite newer optimistic patches which
      // are waiting behind it in the queue, or a newer explicit load.
      if (claimSettingsLoad(store, reloadToken)) {
        applyLoadedSettings(store, storage, getPendingSettingsPatches(store));
      }
    } catch (error) {
      queue.pending.delete(writeId);
      // A multi-key write may have committed before a later key failed. Invalidate
      // every load which started during the write so a pre-write snapshot cannot win.
      // A failed post-save reload does not invalidate loads which started after the
      // write became server-visible; they are valid recovery paths for that failure.
      if (!persistCompleted) {
        queue.writeRevision += 1;
      }
      throw error;
    }
  });

  queue.tail = currentWrite;
  return currentWrite;
}

export const useSettingsStore = defineStore('settings', {
  state: (): State => ({
    startOfWeek: 'Monday',
    theme: 'auto',

    always_active_pattern: '',
    classes: [],

    requestTimeout: 30,

    _loaded: false,
  }),

  getters: {
    loaded(state: State) {
      return state._loaded;
    },
  },

  actions: {
    async ensureLoaded() {
      if (!this.loaded) {
        await this.load();
      }
    },
    async load({ save }: { save?: boolean } = {}) {
      if (typeof localStorage === 'undefined') {
        console.error('localStorage is not supported');
        return;
      }
      const loadToken = beginSettingsLoad(this);
      // Settings are server-authoritative. Theme is the only local fallback because
      // it is needed before settings finish loading.
      const storage = await loadServerBackedSettings();
      if (!claimSettingsLoad(this, loadToken)) {
        return;
      }
      applyLoadedSettings(this, storage, getPendingSettingsPatches(this));

      if (save) {
        await this.save();
      }
    },
    async save(keys?: string[]) {
      // Important check, to avoid saving settings before they are loaded (potentially overwriting them with defaults)
      if (!this.loaded) {
        console.error('Settings not loaded, not saving');
        return;
      }
      const snapshot = snapshotSettingsSubset(this.$state as unknown as SettingsRecord, keys);
      await enqueueSettingsWrite(this, snapshot);
    },
    async update(new_state: SettingsPatch) {
      const keys = Object.keys(new_state);
      const snapshot = snapshotSettingsSubset(new_state as unknown as SettingsRecord, keys);

      this.$patch(state => {
        Object.assign(state, new_state);
      });

      if (keys.length === 0) {
        await this.save(keys);
        return;
      }
      if (!this.loaded) {
        console.error('Settings not loaded, not saving');
        return;
      }

      await enqueueSettingsWrite(this, snapshot);
    },
  },
});
