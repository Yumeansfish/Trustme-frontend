<template>
  <settings-card
    title="Remote Setup"
    icon="terminal"
  >
    <template #meta>
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-base px-2.5 py-1 font-semibold"
          :class="savedConfigured ? 'text-success' : 'text-foreground-muted'"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="savedConfigured ? 'bg-current' : 'bg-foreground-subtle'"
          ></span>
          {{ savedConfigured ? 'Configured' : 'Not configured' }}
        </span>
        <span v-if="dirty" class="text-foreground-muted">Unsaved changes</span>
      </div>
    </template>

    <form class="space-y-5" @submit.prevent="save">
      <aw-alert v-if="loadError" show variant="warning">{{ loadError }}</aw-alert>
      <aw-alert v-if="saveError" show variant="danger">{{ saveError }}</aw-alert>
      <aw-alert v-if="saveMessage" show variant="success">{{ saveMessage }}</aw-alert>
      <aw-alert
        v-if="connectionResult"
        show
        :variant="connectionResult.reachable ? 'success' : 'warning'"
      >
        {{ connectionMessage }}
      </aw-alert>

      <div class="grid gap-5 md:grid-cols-2">
        <div class="space-y-2">
          <span class="text-sm font-semibold text-foreground-strong">SSH target</span>
          <ui-input
            id="remote-ssh-target"
            aria-label="SSH target"
            v-model="draft.sshTarget"
            class="aw-settings-field"
            :disabled="fieldsDisabled"
            :invalid="Boolean(validation.errors.sshTarget)"
            placeholder="trust"
            type="text"
            autocomplete="off"
            @update:model-value="clearFeedback"
          />
          <span v-if="validation.errors.sshTarget" class="block text-sm text-danger">
            {{ validation.errors.sshTarget }}
          </span>
        </div>

        <div class="space-y-2">
          <span class="text-sm font-semibold text-foreground-strong">Participant name</span>
          <ui-input
            id="remote-participant-name"
            aria-label="Participant name"
            v-model="draft.participantName"
            class="aw-settings-field"
            :disabled="fieldsDisabled || participantLocked"
            :invalid="Boolean(validation.errors.participantName)"
            placeholder="Participant name"
            type="text"
            autocomplete="off"
            @update:model-value="clearFeedback"
          />
          <span v-if="validation.errors.participantName" class="block text-sm text-danger">
            {{ validation.errors.participantName }}
          </span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 border-t border-base pt-5">
        <ui-button class="aw-btn aw-btn-md aw-btn-secondary" type="submit" :disabled="saveDisabled">
          <icon v-if="saving" class="mr-2 h-4 w-4 animate-spin" name="sync"></icon>
          {{ saving ? 'Saving…' : 'Save' }}
        </ui-button>
        <ui-button
          class="aw-btn aw-btn-md aw-btn-secondary"
          type="button"
          :disabled="testDisabled"
          @click="testConnection"
        >
          <icon v-if="testingConnection" class="mr-2 h-4 w-4 animate-spin" name="sync"></icon>
          {{ testingConnection ? 'Testing…' : 'Test SSH Connection' }}
        </ui-button>
      </div>
    </form>
  </settings-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import SettingsCard from '~/features/settings/components/SettingsCard.vue';
import {
  createDefaultRemoteSettings,
  normalizeRemoteSettings,
  prepareRemoteSettings,
  prepareRemoteSettingsForSave,
  remoteSettingsEqual,
  validateRemoteSettings,
  type RemoteSettings,
} from '~/features/settings/lib/remoteSettings';
import {
  testRemoteConnection,
  type RemoteConnectionTestResponse,
} from '~/features/settings/lib/remoteSettingsClient';
import {
  remoteParticipantLocked,
  remoteSetupFieldsDisabled,
  remoteSetupSaveDisabled,
} from '~/features/settings/lib/remoteSetupFormState';
import { useSettingsStore } from '~/features/settings/store/settings';

function apiErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as {
    response?: { data?: { error?: unknown; message?: unknown } };
    message?: unknown;
  };
  const payload = candidate?.response?.data;
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
  if (typeof candidate?.message === 'string' && candidate.message.trim()) return candidate.message;
  return fallback;
}

export default defineComponent({
  name: 'RemoteSetupSettings',
  components: {
    SettingsCard,
  },
  data() {
    return {
      settingsStore: useSettingsStore(),
      draft: createDefaultRemoteSettings() as RemoteSettings,
      loading: true,
      saving: false,
      testingConnection: false,
      loadError: '',
      saveError: '',
      saveMessage: '',
      connectionResult: null as RemoteConnectionTestResponse | null,
    };
  },
  computed: {
    validation() {
      return validateRemoteSettings(this.draft);
    },
    savedRemote(): RemoteSettings {
      return normalizeRemoteSettings(this.settingsStore.remote);
    },
    savedConfigured(): boolean {
      const savedValidation = validateRemoteSettings(this.savedRemote);
      return savedValidation.configured && savedValidation.valid;
    },
    dirty(): boolean {
      return !remoteSettingsEqual(this.draft, this.savedRemote);
    },
    participantLocked(): boolean {
      return remoteParticipantLocked(this.savedRemote.participantName);
    },
    fieldsDisabled(): boolean {
      return remoteSetupFieldsDisabled({
        loading: this.loading,
        saving: this.saving,
        testingConnection: this.testingConnection,
      });
    },
    saveDisabled(): boolean {
      return remoteSetupSaveDisabled({
        loaded: this.settingsStore.loaded,
        loading: this.loading,
        saving: this.saving,
        testingConnection: this.testingConnection,
        valid: this.validation.valid,
        dirty: this.dirty,
      });
    },
    testDisabled(): boolean {
      return (
        this.loading ||
        this.saving ||
        this.testingConnection ||
        !this.validation.configured ||
        !this.validation.valid
      );
    },
    connectionMessage(): string {
      if (!this.connectionResult) return '';
      if (this.connectionResult.reachable) return 'SSH connection succeeded.';
      return this.connectionResult.error || 'SSH connection failed.';
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.loadError = '';
      try {
        await this.settingsStore.ensureLoaded();
        this.draft = normalizeRemoteSettings(this.settingsStore.remote);
      } catch (error) {
        console.error('Failed to load remote settings', error);
        this.loadError = apiErrorMessage(error, 'Failed to load remote settings.');
      } finally {
        this.loading = false;
      }
    },
    clearFeedback() {
      this.saveError = '';
      this.saveMessage = '';
      this.connectionResult = null;
    },
    async save() {
      if (this.saveDisabled) return;

      this.saving = true;
      this.saveError = '';
      this.saveMessage = '';
      this.connectionResult = null;
      try {
        const remote = prepareRemoteSettingsForSave(this.draft, this.savedRemote);
        await this.settingsStore.updateRemote(remote);
        this.draft = normalizeRemoteSettings(this.settingsStore.remote);
        this.saveMessage = this.savedConfigured
          ? 'Remote setup saved.'
          : 'Remote features are disabled.';
      } catch (error) {
        console.error('Failed to save remote settings', error);
        this.saveError = apiErrorMessage(error, 'Failed to save remote settings.');
      } finally {
        this.saving = false;
      }
    },
    async testConnection() {
      if (this.testDisabled) return;

      this.testingConnection = true;
      this.saveError = '';
      this.saveMessage = '';
      this.connectionResult = null;
      try {
        this.connectionResult = await testRemoteConnection(prepareRemoteSettings(this.draft));
      } catch (error) {
        console.warn('Failed to test SSH connection', error);
        this.connectionResult = {
          configured: true,
          reachable: false,
          error: apiErrorMessage(error, 'SSH connection failed.'),
        };
      } finally {
        this.testingConnection = false;
      }
    },
  },
});
</script>
