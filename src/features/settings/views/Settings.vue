<template>
  <div class="space-y-8 pb-10">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-2">
        <h3 class="aw-section-title">Settings</h3>
        <p class="aw-caption max-w-2xl">
          Tune how your dashboard starts the day, opens pages, groups devices, and counts active
          time.
        </p>
      </div>
      <theme-toggle-button floating></theme-toggle-button>
    </div>
    <div class="aw-settings-stack">
      <DaystartSettings></DaystartSettings>
      <TimelineDurationSettings></TimelineDurationSettings>
      <LandingPageSettings></LandingPageSettings>
      <DeviceGroupingSettings></DeviceGroupingSettings>
      <ActivePatternSettings></ActivePatternSettings>
    </div>
  </div>
</template>

<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';

import DaystartSettings from '~/features/settings/components/DaystartSettings.vue';
import TimelineDurationSettings from '~/features/settings/components/TimelineDurationSettings.vue';
import LandingPageSettings from '~/features/settings/components/LandingPageSettings.vue';
import DeviceGroupingSettings from '~/features/settings/components/DeviceGroupingSettings.vue';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import ActivePatternSettings from '~/features/settings/components/ActivePatternSettings.vue';

export default {
  name: 'Settings',
  components: {
    DaystartSettings,
    TimelineDurationSettings,
    LandingPageSettings,
    DeviceGroupingSettings,
    ThemeToggleButton,
    ActivePatternSettings,
  },
  async created() {
    await this.init();
  },
  methods: {
    async init() {
      const settingsStore = useSettingsStore();
      return settingsStore.load();
    },
  },
};
</script>
