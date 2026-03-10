<template>
  <div v-if="loaded" id="app-shell" class="bg-canvas h-screen overflow-hidden">
    <div class="flex h-full overflow-hidden">
      <aw-header class="shrink-0"></aw-header>
      <main
        class="min-h-0 min-w-0 flex-1 px-2 py-2 md:px-3 md:py-3"
        :class="viewportPage ? 'overflow-hidden' : 'overflow-y-auto'"
      >
        <div
          class="aw-panel p-3"
          :class="viewportPage ? 'flex h-full min-h-0 flex-col overflow-hidden' : ''"
        >
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
import { applyTheme } from '~/shared/lib/theme';
import AppToaster from '~/shared/ui/AppToaster.vue';
import AppDialog from '~/shared/ui/AppDialog.vue';

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
      themeMediaQuery: null as MediaQueryList | null,
    };
  },

  computed: {
    viewportPage() {
      return Boolean(this.$route.meta.viewportPage);
    },
    settingsTheme() {
      return useSettingsStore().theme;
    },
  },

  watch: {
    settingsTheme(theme) {
      applyTheme(theme);
    },
  },

  async created() {
    try {
      const settingsStore = useSettingsStore();
      await settingsStore.ensureLoaded();
      applyTheme(settingsStore.theme);
    } catch (e) {
      console.error('Failed to load settings or theme:', e);
    } finally {
      this.loaded = true;
    }
  },

  mounted: async function () {
    const serverStore = useServerStore();
    await serverStore.getInfo();

    if (window.matchMedia) {
      this.themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.themeMediaQuery.addEventListener('change', this.handleSystemThemeChange);
    }
  },

  beforeUnmount() {
    this.themeMediaQuery?.removeEventListener('change', this.handleSystemThemeChange);
  },

  methods: {
    handleSystemThemeChange() {
      const settingsStore = useSettingsStore();
      if (settingsStore.theme === 'auto') {
        applyTheme('auto');
      }
    },
  },
});
</script>
