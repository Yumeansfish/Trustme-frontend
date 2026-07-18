<template>
  <aside class="group aw-sidebar">
    <nav class="flex h-full flex-col py-2">
      <div class="flex h-12 items-center px-4 select-none">
        <span class="aw-sidebar-mark aw-sidebar-mark-brand">
          <img alt="Trustme logo" class="h-7 w-7 shrink-0 object-contain" :src="logoUrl" />
        </span>
        <span class="aw-sidebar-title">trust-me</span>
      </div>

      <div class="aw-sidebar-scroll">
        <ui-link :to="homeRoute" active-class="aw-sidebar-link-active" class="aw-sidebar-link h-11 px-4">
          <span class="aw-sidebar-mark">
            <icon class="h-4 w-4 shrink-0" name="home"></icon>
          </span>
          <span class="aw-sidebar-copy">Home</span>
        </ui-link>

        <ui-link
          v-if="singleActivityView"
          :to="singleActivityView.route || '/activity'"
          active-class="aw-sidebar-link-active"
          class="aw-sidebar-link h-11 px-4"
        >
          <span class="aw-sidebar-mark">
            <icon class="h-4 w-4 shrink-0" name="calendar-day"></icon>
          </span>
          <span class="aw-sidebar-copy">Activity</span>
        </ui-link>

        <div v-if="!activityViews || activityViews.length !== 1" class="flex flex-col">
          <div class="flex h-11 items-center px-4 text-foreground-subtle">
            <span class="aw-sidebar-mark">
              <icon class="h-4 w-4 shrink-0" name="calendar-day"></icon>
            </span>
            <span class="aw-sidebar-section-title">Activity</span>
          </div>
          <div class="aw-sidebar-section-panel">
            <div
              v-if="activityViews === null"
              class="flex h-9 items-center px-5 text-foreground-subtle"
            >
              <span class="aw-sidebar-mark aw-sidebar-mark-sub">
                <icon class="h-3.5 w-3.5 shrink-0" name="ellipsis-h"></icon>
              </span>
              <span class="aw-sidebar-copy">Loading...</span>
            </div>
            <div
              v-else-if="activityViews && activityViews.length <= 0"
              class="flex h-9 items-center px-5 text-foreground-subtle"
            >
              <span class="aw-sidebar-copy ml-7">No activity available</span>
            </div>
            <ui-link
              v-for="view in activityViews"
              :key="view.name"
              :to="view.route"
              active-class="aw-sidebar-link-subactive"
              class="aw-sidebar-link h-9 px-5"
            >
              <span class="aw-sidebar-mark aw-sidebar-mark-sub">
                <icon :name="view.icon" class="h-3.5 w-3.5 shrink-0"></icon>
              </span>
              <span class="aw-sidebar-copy">{{ view.name }}</span>
            </ui-link>
          </div>
        </div>

        <ui-link
          to="/review"
          active-class="aw-sidebar-link-active"
          class="aw-sidebar-link h-11 px-4"
        >
          <span class="aw-sidebar-mark">
            <icon class="h-4 w-4 shrink-0" name="history"></icon>
          </span>
          <span class="aw-sidebar-copy">Review</span>
        </ui-link>

        <ui-link to="/away" active-class="aw-sidebar-link-active" class="aw-sidebar-link h-11 px-4">
          <span class="aw-sidebar-mark">
            <icon class="h-4 w-4 shrink-0" name="pause"></icon>
          </span>
          <span class="aw-sidebar-copy">Away Session</span>
        </ui-link>
      </div>

      <div class="mx-3 my-2 aw-sidebar-divider"></div>

      <div class="mt-auto border-t border-base pt-2">
        <ui-link
          to="/buckets"
          active-class="aw-sidebar-link-active"
          class="aw-sidebar-link h-11 px-4"
        >
          <span class="aw-sidebar-mark">
            <icon class="h-4 w-4 shrink-0" name="database"></icon>
          </span>
          <span class="aw-sidebar-copy">Raw Data</span>
        </ui-link>
        <ui-link
          to="/settings"
          active-class="aw-sidebar-link-active"
          class="aw-sidebar-link h-11 px-4"
        >
          <span class="aw-sidebar-mark">
            <icon class="h-4 w-4 shrink-0" name="cog"></icon>
          </span>
          <span class="aw-sidebar-copy">Settings</span>
        </ui-link>
      </div>
    </nav>
  </aside>
</template>

<script lang="ts">
import { useSettingsStore } from '~/features/settings/store/settings';
import { fetchActivityScope } from '~/features/activity/lib/activityScopeClient';
import type { ActivityScopeResult } from '~/features/activity/store/activityTypes';

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Sidebar',
  data() {
    return {
      activityScope: undefined as ActivityScopeResult | null | undefined,
    };
  },
  computed: {
    homeRoute() {
      return '/home';
    },
    logoUrl() {
      return new URL('../../../media/logo/logo.png', import.meta.url).href;
    },
    singleActivityView() {
      return this.activityViews && this.activityViews.length === 1 ? this.activityViews[0] : null;
    },
    activityViews() {
      try {
        const scope = this.activityScope;
        if (!scope || scope.window_buckets.length === 0 || scope.afk_buckets.length === 0)
          return [];
        return [
          {
            name: scope.group_name,
            hostname: scope.resolved_hosts.join(','),
            type: 'default',
            icon: 'desktop',
            route: `/activity/${encodeURIComponent(scope.group_name)}/day`,
          },
        ];
      } catch (e) {
        console.error('Error in Sidebar.activityViews:', e);
        return [];
      }
    },
  },
  mounted: async function () {
    const settingsStore = useSettingsStore();
    await settingsStore.ensureLoaded();
    await this.refreshActivityScope();
  },
  methods: {
    async refreshActivityScope() {
      try {
        this.activityScope = await fetchActivityScope();
      } catch (error) {
        console.error('Failed to load Activity scope', error);
        this.activityScope = null;
      }
    },
  },
});
</script>
