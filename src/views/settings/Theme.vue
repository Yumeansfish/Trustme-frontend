<template lang="pug">
div.space-y-3
  div.flex.flex-col.gap-3(class="sm:flex-row sm:items-center sm:justify-between")
    h5.m-0.text-base.font-semibold.text-slate-900 Theme
    select.h-9.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
      v-if="_loaded"
      :value="theme"
      class="sm:w-40 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      @change="theme = $event.target.value"
    )
      option(value="auto") Auto (System)
      option(value="light") Light
      option(value="dark") Dark
    span.text-sm.text-slate-500(v-else) Loading...
  small.text-sm.text-slate-500
    | Change color theme of the application (you need to change categories colors manually to be suitable with dark mode).
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { useSettingsStore } from '~/stores/settings';
import { detectPreferredTheme } from '~/util/theme';

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
