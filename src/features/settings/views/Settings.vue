<template>
  <div class="space-y-8 pb-10">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <h3 class="aw-section-title aw-title-system">Settings</h3>
      <theme-toggle-button floating></theme-toggle-button>
    </div>
    <div class="aw-settings-stack">
      <DaystartSettings></DaystartSettings>
    </div>
  </div>
</template>

<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';

import DaystartSettings from '~/features/settings/components/DaystartSettings.vue';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';

export default {
  name: 'Settings',
  components: {
    DaystartSettings,
    ThemeToggleButton,
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
