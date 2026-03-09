<template>
<div class="space-y-3">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <h5 class="m-0 text-base font-semibold text-foreground-strong">Theme</h5>
    <ui-select class="aw-select-sm w-full sm:w-40" v-if="_loaded" :value="theme" @change="theme = $event.target.value">
      <option value="auto">Auto (System)</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </ui-select><span class="text-sm text-foreground-muted" v-else>Loading...</span>
  </div><small class="text-sm text-foreground-muted">Change color theme of the application (you need to change categories colors manually to be suitable with dark mode).</small>
</div>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { useSettingsStore } from '~/features/settings/store/settings';
import { detectPreferredTheme } from '~/shared/lib/theme';

export default {
  name: 'Theme',
  computed: {
    ...mapState(useSettingsStore, ['_loaded']),
    theme: {
      get() {
        const settingsStore = useSettingsStore();
        return settingsStore.theme;
      },
      set(value) {
        console.log('Set theme to ' + value);
        const settingsStore = useSettingsStore();
        settingsStore.update({
          theme: value,
        });

        // Determine the actual theme to apply
        const detectedTheme = value === 'auto' ? detectPreferredTheme() : value;

        // Apply newly set theme
        // Create Dark Theme Element
        const themeLink = document.createElement('link');
        themeLink.href = '/dark.css';
        themeLink.rel = 'stylesheet';

        // Remove existing theme link if present
        document.querySelector(`link[href="${new URL(themeLink.href).pathname}"]`)?.remove();

        // Append Dark Theme Element if dark theme should be applied
        if (detectedTheme === 'dark') {
          document.querySelector('head').appendChild(themeLink);
        }
      },
    },
  },
};
</script>
