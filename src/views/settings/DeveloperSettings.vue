<template lang="pug">
div.space-y-4
  h4.mb-3.text-lg.font-semibold.text-slate-900 Developer settings
  b-alert(show) #[b Note:] These settings are meant for developers who (hopefully) know what they are doing, and as such, may break things unexpectedly.

  div.space-y-3
    div.flex.items-start.justify-between.gap-4.rounded-xl.border.border-slate-200.bg-white.p-4.shadow-sm
      div.space-y-1
        h5.text-sm.font-semibold.text-slate-900 Force devmode
        p.text-sm.leading-6.text-slate-500 Devmode enables some features that are still work-in-progress.
      input.h-4.w-4.rounded.border-slate-300.text-slate-900.mt-1(type="checkbox" v-model="devmode" class="focus:ring-slate-400")

    div.flex.items-start.justify-between.gap-4.rounded-xl.border.border-slate-200.bg-white.p-4.shadow-sm
      div.space-y-1
        h5.text-sm.font-semibold.text-slate-900 Show yearly time range
        p.text-sm.leading-6.text-slate-500 Querying an entire year is heavy and likely to time out unless the server is fast enough.
      input.h-4.w-4.rounded.border-slate-300.text-slate-900.mt-1(type="checkbox" v-model="showYearly" class="focus:ring-slate-400")

    div.flex.items-start.justify-between.gap-4.rounded-xl.border.border-slate-200.bg-white.p-4.shadow-sm
      div.space-y-1
        h5.text-sm.font-semibold.text-slate-900 Use multidevice query
        p.text-sm.leading-6.text-slate-500 Multidevice queries are experimental and currently do not support browser buckets or audible-as-active.
      input.h-4.w-4.rounded.border-slate-300.text-slate-900.mt-1(type="checkbox" v-model="useMultidevice" class="focus:ring-slate-400")

    div.flex.flex-col.gap-3.rounded-xl.border.border-slate-200.bg-white.p-4.shadow-sm(class="sm:flex-row sm:items-center sm:justify-between")
      div.space-y-1
        h5.text-sm.font-semibold.text-slate-900 Request timeout
        p.text-sm.leading-6.text-slate-500 The max server request duration before timeout. Reload the web UI after changing it.
      input.h-9.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
        v-model.number="requestTimeout"
        type="number"
        class="sm:w-32 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      )

  div.text-sm.text-slate-500
    | Web UI commit hash: {{ COMMIT_HASH }}
</template>

<script lang="ts">
import { useSettingsStore } from '~/stores/settings';

export default {
  data() {
    return {
      showSettings: false,
    };
  },
  computed: {
    devmode: {
      get() {
        return useSettingsStore().devmode;
      },
      set(devmode) {
        useSettingsStore().update({ devmode });
      },
    },
    showYearly: {
      get() {
        return useSettingsStore().showYearly;
      },
      set(showYearly) {
        useSettingsStore().update({ showYearly });
      },
    },
    useMultidevice: {
      get() {
        return useSettingsStore().useMultidevice;
      },
      set(useMultidevice) {
        useSettingsStore().update({ useMultidevice });
      },
    },
    requestTimeout: {
      get() {
        return useSettingsStore().requestTimeout;
      },
      set(requestTimeout) {
        useSettingsStore().update({ requestTimeout });
      },
    },
  },
};
</script>
