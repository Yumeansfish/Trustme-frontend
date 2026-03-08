<template>
<div class="space-y-6">
  <h3 class="aw-section-title">Settings</h3>
  <div class="aw-divider"></div>
  <DaystartSettings></DaystartSettings>
  <div class="aw-divider"></div>
  <TimelineDurationSettings></TimelineDurationSettings>
  <div class="aw-divider"></div>
  <LandingPageSettings></LandingPageSettings>
  <div class="aw-divider"></div>
  <DeviceGroupingSettings></DeviceGroupingSettings>
  <div class="aw-divider"></div>
  <Theme></Theme>
  <div class="space-y-6" v-if="!$isAndroid">
    <div class="aw-divider"></div>
    <ReleaseNotificationSettings></ReleaseNotificationSettings>
  </div>
  <div class="aw-divider"></div>
  <ColorSettings></ColorSettings>
  <div class="aw-divider"></div>
  <ActivePatternSettings></ActivePatternSettings>
  <div class="aw-divider"></div>
  <CategorizationSettings></CategorizationSettings>
  <div class="aw-divider"></div>
  <DeveloperSettings></DeveloperSettings>
</div>
</template>

<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';
import { useCategoryStore } from '~/features/categorization/store/categories';

import DaystartSettings from '~/features/settings/components/DaystartSettings.vue';
import TimelineDurationSettings from '~/features/settings/components/TimelineDurationSettings.vue';
import ReleaseNotificationSettings from '~/features/settings/components/ReleaseNotificationSettings.vue';
import CategorizationSettings from '~/features/categorization/views/CategorizationSettings.vue';
import LandingPageSettings from '~/features/settings/components/LandingPageSettings.vue';
import DeviceGroupingSettings from '~/features/settings/components/DeviceGroupingSettings.vue';
import DeveloperSettings from '~/features/settings/components/DeveloperSettings.vue';
import Theme from '~/features/settings/components/Theme.vue';
import ColorSettings from '~/features/settings/components/ColorSettings.vue';
import ActivePatternSettings from '~/features/settings/components/ActivePatternSettings.vue';
import { useDialog } from '~/shared/composables/useDialog';

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
