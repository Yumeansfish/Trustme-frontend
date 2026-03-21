<template>
  <div class="aw-settings-stack">
    <settings-card
      title="Start Of Week"
      description="Choose which weekday anchors weekly summaries and trend views."
      icon="calendar-week"
    >
      <template #control>
        <settings-dropdown
          v-model="startOfWeek"
          :options="weekOptions"
          class="aw-settings-dropdown-fixed"
        ></settings-dropdown>
      </template>
    </settings-card>
  </div>
</template>
<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';
import SettingsCard from '~/features/settings/components/SettingsCard.vue';
import SettingsDropdown from '~/features/settings/components/SettingsDropdown.vue';

export default {
  name: 'DaystartSettings',
  components: {
    SettingsCard,
    SettingsDropdown,
  },
  data() {
    return {
      settingsStore: useSettingsStore(),
      weekOptions: [
        { label: 'Sunday', value: 'Sunday' },
        { label: 'Monday', value: 'Monday' },
      ],
    };
  },
  computed: {
    startOfWeek: {
      get: function () {
        return this.settingsStore.startOfWeek;
      },
      set: function (value) {
        this.settingsStore.update({ startOfWeek: value });
      },
    },
  },
};
</script>
