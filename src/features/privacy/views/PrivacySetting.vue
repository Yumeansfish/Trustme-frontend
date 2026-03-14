<template>
  <div class="space-y-8 pb-10">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <h3 class="aw-section-title">Privacy Control</h3>
      <theme-toggle-button floating></theme-toggle-button>
    </div>

    <div class="aw-settings-stack">
      <settings-card
        icon="eye"
        title="Eye Tracker"
      >
        <template #control>
          <ui-button
            class="aw-btn aw-btn-md"
            :class="eyeTrackerEnabled ? 'aw-btn-secondary' : 'aw-btn-highlight'"
            type="button"
            @click="eyeTrackerEnabled = !eyeTrackerEnabled"
          >
            {{ eyeTrackerEnabled ? 'Off' : 'On' }}
          </ui-button>
        </template>
      </settings-card>

      <settings-card
        icon="camera"
        title="Camera"
      >
        <template #control>
          <ui-button
            class="aw-btn aw-btn-md"
            :class="cameraEnabled ? 'aw-btn-secondary' : 'aw-btn-highlight'"
            type="button"
            @click="cameraEnabled = !cameraEnabled"
          >
            {{ cameraEnabled ? 'Off' : 'On' }}
          </ui-button>
        </template>
      </settings-card>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import SettingsCard from '~/features/settings/components/SettingsCard.vue';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';

export default defineComponent({
  name: 'PrivacySetting',
  components: {
    SettingsCard,
    ThemeToggleButton,
  },
  data() {
    return {
      cameraEnabled: false,
      eyeTrackerEnabled: true,
    };
  },
});
</script>
