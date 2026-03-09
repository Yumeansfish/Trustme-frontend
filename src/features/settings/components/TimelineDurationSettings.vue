<template>
<div class="space-y-3">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <h5 class="m-0 text-base font-semibold text-foreground-strong">Duration default value</h5>
    <ui-select class="aw-select-sm w-full sm:w-36" :value="durationDefault" @change="durationDefault = Number($event.target.value)">
      <option :value="15*60">15min</option>
      <option :value="30*60">30min</option>
      <option :value="60*60">1h</option>
      <option :value="2*60*60">2h</option>
      <option :value="4*60*60">4h</option>
      <option :value="6*60*60">6h</option>
      <option :value="12*60*60">12h</option>
      <option :value="24*60*60">24h</option>
    </ui-select>
  </div><small class="text-sm text-foreground-muted">The default duration used for 'show last' in the timeline view.</small>
</div>
</template>
<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';

export default {
  name: 'TimelineDurationSettings',
  data() {
    return {
      settingsStore: useSettingsStore(),
    };
  },
  computed: {
    durationDefault: {
      get() {
        return this.settingsStore.durationDefault;
      },
      set(value) {
        console.log('Set default timeline duration to ' + value);
        this.settingsStore.update({ durationDefault: value });
      },
    },
  },
};
</script>
