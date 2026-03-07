<template lang="pug">
div#wrapper(v-if="loaded")
  aw-header

  div.main-content.px-0(class="md:px-2" :class="fullContainer ? 'w-full' : 'max-w-none'")
    div.my-2.rounded-xl.border.border-slate-200.bg-white.p-3.shadow-sm(class="md:my-3")
      error-boundary
        //- user-satisfaction-poll
        new-release-notification(v-if="isNewReleaseCheckEnabled")
        router-view
  app-toaster
  app-dialog

</template>

<style>
body {
  overflow-x: hidden;
}

.main-content {
  margin-left: 56px;
  min-width: 0;
  padding-left: 24px;
  padding-right: 24px;
  transition: margin-left 0.2s ease;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding-left: 0;
    padding-right: 0;
  }
}

.aw-sidebar:hover ~ .main-content {
  margin-left: 200px;
}
</style>

<script lang="ts">
import { useSettingsStore } from '~/stores/settings';
import { useServerStore } from '~/stores/server';
import { detectPreferredTheme } from '~/util/theme';
import AppToaster from '~/components/ui/AppToaster.vue';
import AppDialog from '~/components/ui/AppDialog.vue';
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
