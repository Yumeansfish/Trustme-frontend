<template>
  <settings-card
    title="Timeline Default Range"
    description="Choose the default time window used when a timeline opens."
    icon="stream"
  >
    <template #control>
      <settings-dropdown
        :model-value="durationDefault"
        :options="durationOptions"
        @update:model-value="durationDefault = Number($event)"
      ></settings-dropdown>
    </template>
  </settings-card>
</template>
<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';
import SettingsCard from '~/features/settings/components/SettingsCard.vue';
import SettingsDropdown from '~/features/settings/components/SettingsDropdown.vue';

export default {
  name: 'TimelineDurationSettings',
  components: {
    SettingsCard,
    SettingsDropdown,
  },
  data() {
    return {
      settingsStore: useSettingsStore(),
      durationOptions: [
        { label: '15 Min', value: 15 * 60, description: 'Compact review window' },
        { label: '30 Min', value: 30 * 60, description: 'Balanced live context' },
        { label: '1 Hour', value: 60 * 60, description: 'Wider short-term context' },
        { label: '2 Hours', value: 2 * 60 * 60, description: 'Half-session overview' },
        { label: '4 Hours', value: 4 * 60 * 60, description: 'Default work block' },
        { label: '6 Hours', value: 6 * 60 * 60, description: 'Longer workday slice' },
        { label: '12 Hours', value: 12 * 60 * 60, description: 'Half-day coverage' },
        { label: '24 Hours', value: 24 * 60 * 60, description: 'Full day window' },
      ],
    };
  },
  computed: {
    durationDefault: {
      get() {
        return this.settingsStore.durationDefault;
      },
      set(value) {
        this.settingsStore.update({ durationDefault: value });
      },
    },
  },
};
</script>
