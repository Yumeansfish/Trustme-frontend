<template>
  <div class="space-y-8 pb-10">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <h1 class="aw-page-title aw-title-system">Privacy Control</h1>
      <theme-toggle-button floating></theme-toggle-button>
    </div>

    <div class="aw-settings-stack">
      <aw-alert v-if="error" show variant="warning">{{ error }}</aw-alert>

      <settings-card
        icon="camera"
        title="Camera & Eye Tracker"
      >
        <template #control>
          <label class="aw-switch aw-privacy-switch" aria-label="Toggle camera and eye tracker">
            <input
              :checked="captureEnabled"
              :disabled="switchDisabled"
              type="checkbox"
              class="aw-switch-input"
              @change="handleToggle($event)"
            />
            <span class="aw-switch-track aw-privacy-switch-track">
              <span class="aw-switch-thumb aw-privacy-switch-thumb inline-flex items-center justify-center">
                <icon
                  v-if="showProgressSpinner"
                  class="h-3 w-3 animate-spin text-foreground-muted"
                  name="sync"
                ></icon>
              </span>
            </span>
          </label>
        </template>
      </settings-card>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import SettingsCard from '~/features/settings/components/SettingsCard.vue';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import {
  fetchPrivacyStatus,
  updatePrivacyEnabled,
  type PrivacyStatusResponse,
} from '~/features/privacy/lib/privacyClient';

export default defineComponent({
  name: 'PrivacySetting',
  components: {
    SettingsCard,
    ThemeToggleButton,
  },
  data() {
    return {
      captureEnabled: false,
      configured: false,
      loading: true,
      saving: false,
      error: '',
    };
  },
  mounted() {
    void this.loadPrivacyStatus();
  },
  methods: {
    async loadPrivacyStatus() {
      this.loading = true;
      this.error = '';
      try {
        this.applyPrivacyStatus(await fetchPrivacyStatus());
      } catch (error) {
        console.error('Failed to load privacy status', error);
        this.configured = false;
        this.error = 'Failed To Load Privacy Control.';
      } finally {
        this.loading = false;
      }
    },
    applyPrivacyStatus(payload: PrivacyStatusResponse) {
      this.configured = payload.configured;
      this.captureEnabled = payload.enabled;
      this.error = payload.error;
    },
    async handleToggle(event: Event) {
      const target = event.target as HTMLInputElement;
      const enabled = target.checked;
      const previousValue = this.captureEnabled;

      this.captureEnabled = enabled;
      this.saving = true;
      this.error = '';
      try {
        this.applyPrivacyStatus(await updatePrivacyEnabled(enabled));
      } catch (error) {
        console.error('Failed to update privacy status', error);
        this.captureEnabled = previousValue;
        this.error = 'Failed To Update Privacy Control.';
      } finally {
        this.saving = false;
      }
    },
  },
  computed: {
    switchDisabled(): boolean {
      return this.loading || this.saving || !this.configured;
    },
    showProgressSpinner(): boolean {
      return this.loading || this.saving;
    },
  },
});
</script>
