<template lang="pug">
div.space-y-3
  div.flex.flex-col.gap-3(class="sm:flex-row sm:items-center sm:justify-between")
    h5.m-0.text-base.font-semibold.text-slate-900 Start of day
    input.h-9.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
      :value="startOfDay"
      type="time"
      class="sm:w-40 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      @change="startOfDay = $event.target.value"
    )
  small.text-sm.text-slate-500
    | The time at which days "start", since humans don't always go to bed before midnight.
    | Set to 04:00 by default.

  div.flex.flex-col.gap-3.pt-2(class="sm:flex-row sm:items-center sm:justify-between")
    h5.m-0.text-base.font-semibold.text-slate-900 Start of week
    select.h-9.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
      v-model="startOfWeek"
      class="sm:w-40 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
    )
      option(value="Saturday") Saturday
      option(value="Sunday") Sunday
      option(value="Monday") Monday
  small.text-sm.text-slate-500
    | The weekday which starts a new week.
</template>
<script lang="ts">
import { useSettingsStore } from '~/stores/settings';

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
