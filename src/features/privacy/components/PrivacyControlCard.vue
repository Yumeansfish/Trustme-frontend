<template>
  <settings-card class="aw-privacy-control-card h-full" icon="camera" title="Privacy Control">
    <template #control>
      <label
        for="privacy-capture-toggle"
        :class="[
          'aw-switch aw-privacy-switch',
          { 'aw-privacy-switch-unavailable': switchUnavailable },
        ]"
        aria-label="Toggle camera and eye tracker"
        :aria-busy="showProgressSpinner"
        :aria-disabled="switchDisabled"
      >
        <input
          id="privacy-capture-toggle"
          :checked="captureEnabled"
          :disabled="switchDisabled"
          type="checkbox"
          class="aw-switch-input"
          @change="handleToggle($event)"
        />
        <span class="aw-switch-track aw-privacy-switch-track">
          <span
            class="aw-switch-thumb aw-privacy-switch-thumb inline-flex items-center justify-center"
          >
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
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import {
  fetchPrivacyStatus,
  updatePrivacyEnabled,
  type PrivacyStatusResponse,
} from '~/features/privacy/lib/privacyClient';
import {
  privacyProgressIsVisible,
  privacyRefreshIntervalMs,
  privacySwitchIsDisabled,
  privacySwitchIsUnavailable,
  privacySwitchView,
  type PrivacyState,
} from '~/features/privacy/lib/privacyState';
import SettingsCard from '~/features/settings/components/SettingsCard.vue';

export default defineComponent({
  name: 'PrivacyControlCard',
  components: {
    SettingsCard,
  },
  data() {
    return {
      captureEnabled: false,
      captureState: 'not-connected' as PrivacyState,
      captureError: '',
      configured: false,
      saving: false,
      requestGeneration: 0,
      refreshTimer: null as number | null,
    };
  },
  mounted() {
    void this.refreshPrivacyStatus();
  },
  beforeUnmount() {
    this.requestGeneration += 1;
    this.clearRefreshTimer();
  },
  methods: {
    clearRefreshTimer() {
      if (this.refreshTimer === null) return;
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    },
    schedulePrivacyRefresh() {
      this.clearRefreshTimer();
      const delay = privacyRefreshIntervalMs({
        state: this.captureState,
        error: this.captureError,
      });
      this.refreshTimer = window.setTimeout(() => {
        this.refreshTimer = null;
        void this.refreshPrivacyStatus();
      }, delay);
    },
    async refreshPrivacyStatus() {
      if (this.saving) return;
      const generation = ++this.requestGeneration;
      this.clearRefreshTimer();
      try {
        const status = await fetchPrivacyStatus();
        if (generation !== this.requestGeneration) return;
        this.applyPrivacyStatus(status);
      } catch (error) {
        console.error('Failed to load privacy status', error);
        if (generation !== this.requestGeneration) return;
        this.captureState = 'not-connected';
        this.captureEnabled = false;
        this.captureError = error instanceof Error ? error.message : 'Unable to reach remote setup';
      } finally {
        if (generation === this.requestGeneration) this.schedulePrivacyRefresh();
      }
    },
    applyPrivacyStatus(payload: PrivacyStatusResponse) {
      const view = privacySwitchView(payload);
      this.configured = payload.configured;
      this.captureState = payload.state;
      this.captureEnabled = view.checked;
      this.captureError = payload.error;
    },
    async handleToggle(event: Event) {
      const target = event.target as HTMLInputElement;
      const enabled = target.checked;
      const previousValue = this.captureEnabled;
      const generation = ++this.requestGeneration;

      this.clearRefreshTimer();
      this.captureEnabled = enabled;
      this.saving = true;
      try {
        const status = await updatePrivacyEnabled(enabled);
        if (generation !== this.requestGeneration) return;
        this.applyPrivacyStatus(status);
      } catch (error) {
        console.error('Failed to update privacy status', error);
        this.captureEnabled = previousValue;
        this.captureState = 'not-connected';
        this.captureError = error instanceof Error ? error.message : 'Unable to reach remote setup';
      } finally {
        if (generation === this.requestGeneration) {
          this.saving = false;
          this.schedulePrivacyRefresh();
        }
      }
    },
  },
  computed: {
    switchUnavailable(): boolean {
      return privacySwitchIsUnavailable({
        configured: this.configured,
        state: this.captureState,
      });
    },
    switchDisabled(): boolean {
      return privacySwitchIsDisabled(
        { configured: this.configured, state: this.captureState },
        this.saving
      );
    },
    showProgressSpinner(): boolean {
      return privacyProgressIsVisible(this.saving);
    },
  },
});
</script>

<style scoped>
.aw-privacy-control-card {
  display: flex;
  min-height: 9.5rem;
  align-items: center;
}

.aw-privacy-control-card :deep(.aw-settings-card-top) {
  width: 100%;
}

.aw-privacy-control-card :deep(.aw-settings-card-top > div:first-child) {
  align-items: center;
}

.aw-privacy-control-card :deep(.aw-settings-card-control) {
  justify-self: end;
}

.aw-privacy-switch-unavailable {
  cursor: default;
  opacity: 0.58;
}

.aw-privacy-switch-unavailable .aw-privacy-switch-track,
.aw-privacy-switch-unavailable .aw-switch-input:checked + .aw-privacy-switch-track {
  cursor: default;
  background-color: rgb(var(--foreground-subtle) / 0.14);
  box-shadow: inset 0 0 0 1px rgb(var(--foreground-subtle) / 0.1);
}

.aw-privacy-switch-unavailable .aw-privacy-switch-thumb {
  background-color: rgb(var(--surface-muted));
  box-shadow: none;
}
</style>
