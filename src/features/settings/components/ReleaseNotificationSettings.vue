<template>
<div class="flex items-start justify-between gap-4">
  <div class="space-y-1">
    <h5 class="text-sm font-semibold text-foreground-strong">New release notification</h5><small class="aw-caption">We will send you a notification if there is a new release available for download, this check will happen at most once per day.</small>
  </div>
  <ui-switch v-model="isEnabled"></ui-switch>
</div>
</template>

<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';

export default {
  computed: {
    isEnabled: {
      get() {
        const settingsStore = useSettingsStore();
        return settingsStore.newReleaseCheckData.isEnabled;
      },
      set(value) {
        const settingsStore = useSettingsStore();
        const data = settingsStore.newReleaseCheckData;
        settingsStore.update({
          newReleaseCheckData: { ...data, isEnabled: value },
        });
      },
    },
  },
};
</script>
