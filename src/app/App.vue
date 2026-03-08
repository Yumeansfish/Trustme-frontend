<template>
  <div v-if="loaded" id="app-shell" class="bg-canvas h-screen overflow-hidden">
    <div class="flex h-full overflow-hidden">
      <aw-header class="shrink-0"></aw-header>
      <main
        class="min-h-0 min-w-0 flex-1 overflow-y-auto px-2 pt-2 md:px-3"
        :class="fullContainer ? 'w-full' : 'max-w-none'"
      >
        <div class="aw-panel my-2 p-3 md:my-3">
          <error-boundary>
            <new-release-notification
              v-if="isNewReleaseCheckEnabled"
            ></new-release-notification>
            <router-view></router-view>
          </error-boundary>
        </div>
      </main>
    </div>
    <app-toaster></app-toaster>
    <app-dialog></app-dialog>
  </div>
</template>

<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';
import { useServerStore } from '~/shared/stores/server';
import { detectPreferredTheme } from '~/shared/lib/theme';
import AppToaster from '~/shared/ui/AppToaster.vue';
import AppDialog from '~/shared/ui/AppDialog.vue';
// if vite is used, you can import css file as module
//import darkCssUrl from '../static/dark.css?url';
//import darkCssContent from '../static/dark.css?inline';

import { defineComponent } from 'vue';

export default defineComponent({
  components: {
    AppToaster,
    AppDialog,
  },
  data: function () {
    return {
      activityViews: [],
      isNewReleaseCheckEnabled: !process.env.VUE_APP_ON_ANDROID,
      loaded: false,
    };
  },

  computed: {
    fullContainer() {
      return this.$route.meta.fullContainer;
    },
  },

  async created() {
    try {
      // Get Theme From LocalStorage
      const settingsStore = useSettingsStore();
      await settingsStore.ensureLoaded();
      const theme = settingsStore.theme;
      const detectedTheme = theme === 'auto' ? detectPreferredTheme() : theme;

      // Apply the dark theme if detected
      if (detectedTheme === 'dark') {
        const themeLink = document.createElement('link');
        themeLink.href = '/dark.css';
        themeLink.rel = 'stylesheet';
        document.querySelector('head')?.appendChild(themeLink);
      }
    } catch (e) {
      console.error('Failed to load settings or theme:', e);
    } finally {
      this.loaded = true;
    }
  },

  mounted: async function () {
    const serverStore = useServerStore();
    await serverStore.getInfo();
  },
});
</script>
