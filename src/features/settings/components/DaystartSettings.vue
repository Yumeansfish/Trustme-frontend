<template>
  <div class="aw-settings-stack">
    <settings-card
      title="Start Of Day"
      description="Shift the day boundary for late nights, overnight work, and sessions that continue past midnight."
      icon="clock"
    >
      <template #control>
        <ui-input
          class="aw-settings-field w-full"
          :value="startOfDay"
          type="time"
          @change="startOfDay = $event.target.value"
        />
      </template>
    </settings-card>

    <settings-card
      title="Start Of Week"
      description="Choose which weekday anchors weekly summaries and trend views."
      icon="calendar-week"
    >
      <template #control>
        <settings-dropdown v-model="startOfWeek" :options="weekOptions"></settings-dropdown>
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
        { label: 'Saturday', value: 'Saturday' },
        { label: 'Sunday', value: 'Sunday' },
        { label: 'Monday', value: 'Monday' },
      ],
    };
  },
  computed: {
    startOfDay: {
      get: function () {
        return this.settingsStore.startOfDay;
      },
      set: function (value) {
        this.settingsStore.update({ startOfDay: value });
      },
    },
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
