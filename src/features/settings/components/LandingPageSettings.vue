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
import { getEffectiveDeviceMappings } from '~/features/settings/lib/deviceMappings';

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
    effectiveActivityGroups() {
      const settingsStore = useSettingsStore();
      const allHosts = this.bucketsStore.hosts.filter(host => host && host !== 'unknown');
      return getEffectiveDeviceMappings(settingsStore.deviceMappings, allHosts);
    },
    landingPageOptions() {
      const groupEntries =
        Object.keys(this.effectiveActivityGroups).length > 1
          ? Object.entries(this.effectiveActivityGroups)
              .map(([groupName, hosts]) => {
                const validHosts = hosts.filter(host => host && host !== 'unknown');
                if (validHosts.length <= 0) return null;

                return {
                  label: `Activity (${groupName})`,
                  value: `/activity/${encodeURIComponent(validHosts.join(','))}`,
                  description: 'Jump straight into one device group',
                };
              })
              .filter(Boolean)
          : [];

      return [
        {
          label: 'Activity',
          value: '/activity',
          description: 'Open the main dashboard',
        },
        ...groupEntries,
      ];
    },
  },
  async mounted() {
    await this.bucketsStore.ensureLoaded();
    this.loaded = true;
  },
};
</script>
