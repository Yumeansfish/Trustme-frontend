<template>
  <ui-button
    :class="buttonClass"
    :aria-label="buttonTitle"
    :title="buttonTitle"
    :variant="floating ? undefined : 'secondary'"
    :size="floating ? undefined : 'md'"
    type="button"
    @click="toggleTheme"
  >
    <icon class="h-4 w-4 shrink-0" :name="isDark ? 'sun' : 'moon'"></icon>
    <span v-if="!floating" :class="labelClass">{{ isDark ? 'Light mode' : 'Dark mode' }}</span>
  </ui-button>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

import { useSettingsStore } from '~/features/settings/store/settings';
import { applyTheme, resolveTheme } from '~/shared/lib/theme';

export default defineComponent({
  name: 'ThemeToggleButton',
  props: {
    floating: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const settingsStore = useSettingsStore();

    const isDark = computed(() => resolveTheme(settingsStore.theme) === 'dark');
    const buttonTitle = computed(() =>
      isDark.value ? 'Switch to light mode' : 'Switch to dark mode'
    );
    const buttonClass = computed(() =>
      props.floating
        ? `aw-btn aw-btn-md h-9 w-9 shrink-0 px-0 ${
            isDark.value ? 'aw-btn-theme aw-btn-theme-active' : 'aw-btn-theme'
          }`
        : `aw-sidebar-link h-11 w-full px-4 ${isDark.value ? 'aw-sidebar-link-active' : ''}`
    );
    const labelClass = computed(() => 'aw-sidebar-copy');

    const toggleTheme = async () => {
      const nextTheme = isDark.value ? 'light' : 'dark';
      applyTheme(nextTheme);
      await settingsStore.update({ theme: nextTheme });
    };

    return {
      buttonClass,
      buttonTitle,
      isDark,
      labelClass,
      toggleTheme,
    };
  },
});
</script>
