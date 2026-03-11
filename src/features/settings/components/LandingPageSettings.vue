<template>
  <settings-card
    title="Landing Page"
    description="Choose where ActivityWatch should open by default."
    icon="desktop"
  >
    <template #control>
      <settings-dropdown
        v-if="loaded"
        v-model="landingpage"
        :options="landingPageOptions"
      ></settings-dropdown>
      <div v-else class="aw-settings-subpanel text-sm text-foreground-muted">Loading pages...</div>
    </template>
  </settings-card>
</template>

<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import SettingsCard from '~/features/settings/components/SettingsCard.vue';
import SettingsDropdown from '~/features/settings/components/SettingsDropdown.vue';

export default {
  name: 'LandingPageSettings',
  components: {
    SettingsCard,
    SettingsDropdown,
  },
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
    landingPageOptions() {
      return [
        {
          label: 'Activity',
          value: '/activity',
          description: 'Open the main dashboard',
        },
        ...this.hostnames.map(hostname => ({
          label: `Activity (${hostname})`,
          value: `/activity/${encodeURIComponent(hostname)}`,
          description: 'Jump straight into one device view',
        })),
        {
          label: 'Timeline',
          value: '/timeline',
          description: 'Open the live timeline view',
        },
      ];
    },
  },
  async mounted() {
    await this.bucketsStore.ensureLoaded();
    this.loaded = true;
  },
};
</script>
