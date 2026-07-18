<template>
  <div v-if="loaded" id="app-shell" class="bg-canvas h-screen overflow-hidden">
    <div class="flex h-full overflow-hidden">
      <sidebar-navigation class="shrink-0" />
      <main
        class="flex min-h-0 min-w-0 flex-1 flex-col px-2 py-2 md:px-3 md:py-3"
        :class="viewportPage ? 'overflow-hidden' : 'overflow-y-auto'"
      >
        <div
          class="min-h-0 min-w-0"
          :class="
            viewportPage
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : fullContainerPage
                ? 'flex flex-1 flex-col'
                : ''
          "
        >
          <ErrorBoundary>
            <router-view></router-view>
          </ErrorBoundary>
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
import { requestReviewSync } from '~/features/review/lib/reviewClient';
import { applyTheme } from '~/shared/lib/theme';
import AppToaster from '~/shared/ui/AppToaster.vue';
import AppDialog from '~/shared/ui/AppDialog.vue';
import ErrorBoundary from '~/shared/feedback/ErrorBoundary.vue';
import SidebarNavigation from '~/app/layout/Sidebar.vue';

import { defineComponent } from 'vue';

export default defineComponent({
  components: {
    AppToaster,
    AppDialog,
    ErrorBoundary,
    SidebarNavigation,
  },
  data: function () {
    return {
      activityViews: [],
      loaded: false,
      themeMediaQuery: null as MediaQueryList | null,
    };
  },

  computed: {
    viewportPage() {
      return Boolean(this.$route.meta.viewportPage);
    },
    fullContainerPage() {
      return Boolean(this.$route.meta.fullContainer);
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
    void requestReviewSync().catch(error => {
      console.warn('Failed to request Review sync:', error);
    });

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
