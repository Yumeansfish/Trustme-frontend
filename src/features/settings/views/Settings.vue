<template>
<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <h3 class="aw-section-title">Settings</h3>
    <theme-toggle-button floating></theme-toggle-button>
  </div>
  <div class="aw-divider"></div>
  <DaystartSettings></DaystartSettings>
  <div class="aw-divider"></div>
  <TimelineDurationSettings></TimelineDurationSettings>
  <div class="aw-divider"></div>
  <LandingPageSettings></LandingPageSettings>
  <div class="aw-divider"></div>
  <DeviceGroupingSettings></DeviceGroupingSettings>
  <div class="aw-divider"></div>
  <ActivePatternSettings></ActivePatternSettings>
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
