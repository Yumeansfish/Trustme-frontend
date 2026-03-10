<template>
  <ui-button
    class="aw-sidebar-link h-11 w-full px-4"
    :class="isDark ? 'aw-sidebar-link-active' : ''"
    :title="buttonTitle"
    type="button"
    @click="toggleTheme"
  >
    <icon class="h-4 w-4 shrink-0" :name="isDark ? 'sun' : 'moon'"></icon>
    <span class="aw-sidebar-copy">{{ isDark ? 'Light mode' : 'Dark mode' }}</span>
  </ui-button>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

import { useSettingsStore } from '~/features/settings/store/settings';
import { applyTheme, resolveTheme } from '~/shared/lib/theme';

export default defineComponent({
  name: 'ThemeToggleButton',
  setup() {
    const settingsStore = useSettingsStore();

    const isDark = computed(() => resolveTheme(settingsStore.theme) === 'dark');
    const buttonTitle = computed(() =>
      isDark.value ? 'Switch to light mode' : 'Switch to dark mode'
    );

    const toggleTheme = async () => {
      const nextTheme = isDark.value ? 'light' : 'dark';
      applyTheme(nextTheme);
      await settingsStore.update({ theme: nextTheme });
    };

    return {
      buttonTitle,
      isDark,
      toggleTheme,
    };
  },
});
</script>
