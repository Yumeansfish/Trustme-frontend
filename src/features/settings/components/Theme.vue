<template>
<div class="space-y-3">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <h5 class="m-0 text-base font-semibold text-foreground-strong">Theme</h5>
    <ui-select class="aw-select-sm w-full sm:w-40" v-if="_loaded" :value="theme" @change="onThemeChange">
      <option value="auto">Auto (System)</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </ui-select>
    <span class="text-sm text-foreground-muted" v-else>Loading...</span>
  </div>
  <small class="text-sm text-foreground-muted">Change color theme of the application. The sidebar now also has a quick dark/light toggle.</small>
</div>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { useSettingsStore } from '~/features/settings/store/settings';
import { applyTheme } from '~/shared/lib/theme';

export default {
  name: 'Theme',
  computed: {
    ...mapState(useSettingsStore, ['_loaded']),
    theme() {
      return useSettingsStore().theme;
    },
  },
  methods: {
    async onThemeChange(event) {
      const value = event.target.value;
      applyTheme(value);
      await useSettingsStore().update({
        theme: value,
      });
    },
  },
};
</script>
