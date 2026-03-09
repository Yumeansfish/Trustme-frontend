<template>
<div class="space-y-3">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <h5 class="m-0 text-base font-semibold text-foreground-strong">Landing page</h5>
    <ui-select class="aw-select-sm w-full sm:w-56" v-if="loaded" :value="landingpage" @change="landingpage = $event.target.value">
      <option value="/activity">Activity</option>
      <option v-for="hostname in hostnames" :key="hostname" :value="'/activity/' + encodeURIComponent(hostname)">Activity ({{hostname}})</option>
      <option value="/timeline">Timeline</option>
    </ui-select><span class="text-sm text-foreground-muted" v-else>Loading...</span>
  </div><small class="text-sm text-foreground-muted">The page to open when opening ActivityWatch.</small>
</div>
</template>

<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';
import { useBucketsStore } from '~/features/buckets/store/buckets';

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
        return settingsStore.landingpage || '/activity';
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
