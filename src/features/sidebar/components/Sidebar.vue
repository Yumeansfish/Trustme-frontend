<template>
  <aside class="group aw-sidebar">
    <nav class="flex h-full flex-col py-2">
      <div class="flex h-11 items-center px-4 select-none">
        <img class="h-6 w-6 shrink-0 object-contain" src="/logo.png" />
        <span class="aw-sidebar-title">trust-me</span>
      </div>

      <div class="aw-sidebar-scroll">
        <ui-link
          v-if="singleActivityView"
          :to="singleActivityView.route || '/activity'"
          active-class="aw-sidebar-link-active"
          class="aw-sidebar-link h-11 px-4"
        >
          <icon class="h-4 w-4 shrink-0" name="calendar-day"></icon>
          <span class="aw-sidebar-copy">Activity</span>
        </ui-link>

        <div v-if="!activityViews || activityViews.length !== 1" class="flex flex-col">
          <div class="flex h-11 items-center px-4 text-foreground-subtle">
            <icon class="h-4 w-4 shrink-0" name="calendar-day"></icon>
            <span class="aw-sidebar-section-title">Activity</span>
          </div>
          <div class="aw-sidebar-section-panel">
            <div
              v-if="activityViews === null"
              class="flex h-9 items-center px-5 text-foreground-subtle"
            >
              <icon class="h-3.5 w-3.5 shrink-0" name="ellipsis-h"></icon>
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
              <icon :name="view.icon" class="h-3.5 w-3.5 shrink-0"></icon>
              <span class="aw-sidebar-copy">{{ view.name }}</span>
            </ui-link>
          </div>
        </div>

        <ui-link
          to="/streamdeck"
          active-class="aw-sidebar-link-active"
          class="aw-sidebar-link h-11 px-4"
        >
          <icon class="h-4 w-4 shrink-0" name="list"></icon>
          <span class="aw-sidebar-copy">Check-Ins</span>
        </ui-link>

        <ui-link to="/away" active-class="aw-sidebar-link-active" class="aw-sidebar-link h-11 px-4">
          <icon class="h-4 w-4 shrink-0" name="pause"></icon>
          <span class="aw-sidebar-copy">Away Session</span>
        </ui-link>

        <ui-link
          to="/privacy"
          active-class="aw-sidebar-link-active"
          class="aw-sidebar-link h-11 px-4"
        >
          <icon class="h-4 w-4 shrink-0" name="eye-slash"></icon>
          <span class="aw-sidebar-copy">Privacy Control</span>
        </ui-link>
      </div>

      <div class="mx-3 my-2 aw-sidebar-divider"></div>

      <div class="mt-auto border-t border-base pt-2">
        <ui-link
          to="/buckets"
          active-class="aw-sidebar-link-active"
          class="aw-sidebar-link h-11 px-4"
        >
          <icon class="h-4 w-4 shrink-0" name="database"></icon>
          <span class="aw-sidebar-copy">Raw Data</span>
        </ui-link>
        <ui-link
          to="/settings"
          active-class="aw-sidebar-link-active"
          class="aw-sidebar-link h-11 px-4"
        >
          <icon class="h-4 w-4 shrink-0" name="cog"></icon>
          <span class="aw-sidebar-copy">Settings</span>
        </ui-link>
      </div>
    </nav>
  </aside>
</template>

<script lang="ts">
import _ from 'lodash';

import { useBucketsStore } from '~/features/buckets/store/buckets';
import { useSettingsStore } from '~/features/settings/store/settings';
import { getEffectiveDeviceMappings } from '~/features/settings/lib/deviceMappings';

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Sidebar',
  computed: {
    buckets() {
      return useBucketsStore().buckets;
    },
    singleActivityView() {
      return this.activityViews && this.activityViews.length === 1 ? this.activityViews[0] : null;
    },
    activityViews() {
      try {
        const settingsStore = useSettingsStore();
        if (!settingsStore.loaded || !this.buckets || this.buckets.length === 0) return [];

        const types_by_host: Record<string, any> = {};
        const views = [];

        // Identify which watchers each host has
        _.each(this.buckets, v => {
          types_by_host[v.hostname] = types_by_host[v.hostname] || {};
          types_by_host[v.hostname].afk ||= v.type == 'afkstatus';
          types_by_host[v.hostname].window ||= v.type == 'currentwindow';
          types_by_host[v.hostname].android ||=
            v.type == 'currentwindow' && v.id.includes('android');
        });

        const processedHosts = new Set<string>();
        const allHosts = Object.keys(types_by_host).filter(host => host && host !== 'unknown');
        const effectiveMappings = getEffectiveDeviceMappings(
          settingsStore.deviceMappings,
          allHosts
        );

        _.each(effectiveMappings, (hostsArr: string[], groupName: string) => {
          const validGroupHosts = hostsArr.filter(h => types_by_host[h]);
          if (validGroupHosts.length <= 0) return;
          const hasActivityData = validGroupHosts.some(
            h => types_by_host[h].window || types_by_host[h].android
          );
          if (!hasActivityData) return;

          validGroupHosts.forEach(h => processedHosts.add(h));
          const isMostlyAndroid =
            validGroupHosts.length > 0 &&
            validGroupHosts.every(h => types_by_host[h].android) &&
            validGroupHosts.some(h => types_by_host[h].android);

          views.push({
            name: groupName,
            hostname: validGroupHosts.join(','),
            type: isMostlyAndroid ? 'android' : 'default',
            icon: isMostlyAndroid ? 'mobile' : 'desktop',
            route: `/activity/${encodeURIComponent(validGroupHosts.join(','))}`,
          });
        });

        // Defensive fallback if a host somehow wasn't captured by effective mappings.
        _.each(types_by_host, (types, hostname) => {
          if (processedHosts.has(hostname) || hostname === 'unknown') return;
          if (!types.window && !types.android) return;

          if (types['android']) {
            views.push({
              name: `${hostname} (Android)`,
              hostname: hostname,
              type: 'android',
              icon: 'mobile',
              route: `/activity/${encodeURIComponent(hostname)}`,
            });
          } else {
            views.push({
              name: hostname,
              hostname: hostname,
              type: 'default',
              icon: 'desktop',
              route: `/activity/${encodeURIComponent(hostname)}`,
            });
          }
        });

        return views;
      } catch (e) {
        console.error('Error in Sidebar.activityViews:', e);
        return [];
      }
    },
  },
  mounted: async function () {
    const bucketStore = useBucketsStore();
    const settingsStore = useSettingsStore();
    await settingsStore.ensureLoaded();
    await bucketStore.ensureLoaded();
  },
});
</script>
