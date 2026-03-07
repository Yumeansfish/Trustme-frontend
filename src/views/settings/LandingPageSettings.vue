<template lang="pug">
div.space-y-3
  div.flex.flex-col.gap-3(class="sm:flex-row sm:items-center sm:justify-between")
    h5.m-0.text-base.font-semibold.text-slate-900 Landing page
    select.h-9.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
      v-if="loaded"
      :value="landingpage"
      class="sm:w-56 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      @change="landingpage = $event.target.value"
    )
      option(value="/home") Home
      option(v-for="hostname in hostnames" :key="hostname" :value="'/activity/' + hostname + '/view/'") Activity ({{hostname}})
      option(value="/timeline") Timeline
    span.text-sm.text-slate-500(v-else) Loading...
  small.text-sm.text-slate-500
    | The page to open when opening ActivityWatch, or clicking the logo in the top menu.
</template>

<script lang="ts">
import { useSettingsStore } from '~/stores/settings';
import { useBucketsStore } from '~/stores/buckets';

export default {
  name: 'LandingPageSettings',
  data: () => {
    return {
      bucketsStore: useBucketsStore(),

      loaded: false,
    };
  },
  computed: {
    landingpage: {
      get: function () {
        const settingsStore = useSettingsStore();
        return settingsStore.landingpage || '/home';
      },
      set: function (val) {
        const settingsStore = useSettingsStore();
        settingsStore.update({ landingpage: val });
      },
    },
    hostnames() {
      return this.bucketsStore.hosts;
    },
  },
  async mounted() {
    await this.bucketsStore.ensureLoaded();
    this.loaded = true;
  },
};
</script>
