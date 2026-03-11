<template>
<div class="space-y-4">
  <h4 class="aw-subtitle mb-3">Developer settings</h4>
  <aw-alert show><b>Note:</b> These settings are meant for developers who (hopefully) know what they are doing, and as such, may break things unexpectedly.</aw-alert>
  <div class="space-y-3">
    <div class="aw-card flex items-start justify-between gap-4">
      <div class="space-y-1">
        <h5 class="text-sm font-semibold text-foreground-strong">Force devmode</h5>
        <p class="text-sm leading-6 text-foreground-muted">Devmode enables some features that are still work-in-progress.</p>
      </div>
      <ui-checkbox class="aw-checkbox mt-1" v-model="devmode"  />
    </div>
    <div class="aw-card flex items-start justify-between gap-4">
      <div class="space-y-1">
        <h5 class="text-sm font-semibold text-foreground-strong">Show yearly time range</h5>
        <p class="text-sm leading-6 text-foreground-muted">Querying an entire year is heavy and likely to time out unless the server is fast enough.</p>
      </div>
      <ui-checkbox class="aw-checkbox mt-1" v-model="showYearly"  />
    </div>
    <div class="aw-card flex items-start justify-between gap-4">
      <div class="space-y-1">
        <h5 class="text-sm font-semibold text-foreground-strong">Use multidevice query</h5>
        <p class="text-sm leading-6 text-foreground-muted">Multidevice queries are experimental and currently do not support browser buckets or audible-as-active.</p>
      </div>
      <ui-checkbox class="aw-checkbox mt-1" v-model="useMultidevice"  />
    </div>
    <div class="aw-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h5 class="text-sm font-semibold text-foreground-strong">Request timeout</h5>
        <p class="text-sm leading-6 text-foreground-muted">The max server request duration before timeout. Reload the web UI after changing it.</p>
      </div>
      <ui-input class="aw-input-sm w-full sm:w-32" v-model.number="requestTimeout" type="number" />
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';

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
