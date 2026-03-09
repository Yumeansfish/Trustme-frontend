<template>
<div class="flex items-start justify-between gap-4">
  <div class="space-y-1">
    <h5 class="text-sm font-semibold text-foreground-strong">Use fallback colors</h5><small class="aw-caption">Uses the old coloring style for some visualizations when uncategorized or no category color.</small>
  </div>
  <ui-switch v-model="useColorFallback"></ui-switch>
</div>
</template>

<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';

export default {
  name: 'ColorSettings',
  computed: {
    useColorFallback: {
      get: function () {
        const settingsStore = useSettingsStore();
        return settingsStore.useColorFallback;
      },
      set: function (val) {
        const settingsStore = useSettingsStore();
        settingsStore.update({ useColorFallback: val });
      },
    },
  },
};
</script>
