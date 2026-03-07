<template lang="pug">
div.space-y-3
  div.flex.flex-col.gap-3(class="sm:flex-row sm:items-center sm:justify-between")
    h5.m-0.text-base.font-semibold.text-slate-900 Duration default value
    select.h-9.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
      :value="durationDefault"
      class="sm:w-36 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      @change="durationDefault = Number($event.target.value)"
    )
      option(:value="15*60") 15min
      option(:value="30*60") 30min
      option(:value="60*60") 1h
      option(:value="2*60*60") 2h
      option(:value="4*60*60") 4h
      option(:value="6*60*60") 6h
      option(:value="12*60*60") 12h
      option(:value="24*60*60") 24h
  small.text-sm.text-slate-500
    | The default duration used for 'show last' in the timeline view.
</template>
<script lang="ts">
import { useSettingsStore } from '~/stores/settings';

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
