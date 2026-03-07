<template lang="pug">
div.space-y-6
  h3.text-2xl.font-semibold.text-slate-900 Settings

  div.h-px.bg-slate-200
  DaystartSettings

  div.h-px.bg-slate-200
  TimelineDurationSettings

  div.h-px.bg-slate-200
  LandingPageSettings

  div.h-px.bg-slate-200
  DeviceGroupingSettings

  div.h-px.bg-slate-200
  Theme

  div(v-if="!$isAndroid").space-y-6
    div.h-px.bg-slate-200
    ReleaseNotificationSettings

  div.h-px.bg-slate-200
  ColorSettings

  div.h-px.bg-slate-200
  ActivePatternSettings

  div.h-px.bg-slate-200
  CategorizationSettings

  div.h-px.bg-slate-200
  DeveloperSettings
</template>

<script lang="ts">
import { useSettingsStore } from '~/stores/settings';
import { useCategoryStore } from '~/stores/categories';

import DaystartSettings from '~/views/settings/DaystartSettings.vue';
import TimelineDurationSettings from '~/views/settings/TimelineDurationSettings.vue';
import ReleaseNotificationSettings from '~/views/settings/ReleaseNotificationSettings.vue';
import CategorizationSettings from '~/views/settings/CategorizationSettings.vue';
import LandingPageSettings from '~/views/settings/LandingPageSettings.vue';
import DeviceGroupingSettings from '~/views/settings/DeviceGroupingSettings.vue';
import DeveloperSettings from '~/views/settings/DeveloperSettings.vue';
import Theme from '~/views/settings/Theme.vue';
import ColorSettings from '~/views/settings/ColorSettings.vue';
import ActivePatternSettings from '~/views/settings/ActivePatternSettings.vue';
import { useDialog } from '~/composables/useDialog';

export default {
  name: 'Settings',
  components: {
    DaystartSettings,
    TimelineDurationSettings,
    ReleaseNotificationSettings,
    CategorizationSettings,
    LandingPageSettings,
    DeviceGroupingSettings,
    Theme,
    ColorSettings,
    DeveloperSettings,
    ActivePatternSettings,
  },
  async beforeRouteLeave() {
    const categoryStore = useCategoryStore();
    if (categoryStore.classes_unsaved_changes) {
      const { confirm } = useDialog();
      return await confirm({
        title: 'Unsaved category changes',
        description: 'Your category edits are not saved yet. Leave this page anyway?',
        confirmText: 'Leave page',
        cancelText: 'Stay here',
      });
    }
    return true;
  },
  async created() {
    await this.init();
  },
  methods: {
    async init() {
      const settingsStore = useSettingsStore();
      return settingsStore.load();
    },
  },
};
</script>
