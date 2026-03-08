<template>
<div class="space-y-3">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <h5 class="m-0 text-base font-semibold text-foreground-strong">Start of day</h5>
    <input class="aw-input-sm w-full sm:w-40" :value="startOfDay" type="time" @change="startOfDay = $event.target.value">
  </div><small class="text-sm text-foreground-muted">
    The time at which days "start", since humans don't always go to bed before midnight.
    Set to 04:00 by default.</small>
  <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
    <h5 class="m-0 text-base font-semibold text-foreground-strong">Start of week</h5>
    <select class="aw-select-sm w-full sm:w-40" v-model="startOfWeek">
      <option value="Saturday">Saturday</option>
      <option value="Sunday">Sunday</option>
      <option value="Monday">Monday</option>
    </select>
  </div><small class="text-sm text-foreground-muted">The weekday which starts a new week.</small>
</div>
</template>
<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';

export default {
  name: 'DaystartSettings',
  data() {
    return {
      settingsStore: useSettingsStore(),
    };
  },
  computed: {
    startOfDay: {
      get: function () {
        return this.settingsStore.startOfDay;
      },
      set: function (value) {
        console.log('Set start of day to ' + value);
        this.settingsStore.update({ startOfDay: value });
      },
    },
    startOfWeek: {
      get: function () {
        return this.settingsStore.startOfWeek;
      },
      set: function (value) {
        console.log('Set start of week to ' + value);
        this.settingsStore.update({ startOfWeek: value });
      },
    },
  },
};
</script>
