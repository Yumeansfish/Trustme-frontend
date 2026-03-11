<template>
  <div class="aw-activity-redirect">Loading activity…</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { get_today_with_offset } from '~/app/lib/time';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import { defaultViews } from '~/features/activity/store/views';
import { useSettingsStore } from '~/features/settings/store/settings';

function resolveDefaultHost() {
  const bucketsStore = useBucketsStore();
  const settingsStore = useSettingsStore();
  const isActivityHost = (host: string) =>
    host && host !== 'unknown' && bucketsStore.available(host).category;

  const deviceMappings = settingsStore.deviceMappings || {};
  for (const hosts of Object.values(deviceMappings)) {
    const validHosts = hosts.filter(isActivityHost);
    if (validHosts.length > 0) {
      return validHosts.join(',');
    }
  }

  return (
    bucketsStore.hosts.find(isActivityHost) ||
    bucketsStore.hosts.find(host => host && host !== 'unknown') ||
    null
  );
}

function resolveDefaultViewId() {
  const settingsStore = useSettingsStore();
  const configuredViews = Array.isArray(settingsStore.views)
    ? settingsStore.views
    : Object.values(settingsStore.views || {});
  const normalizedViews = configuredViews.filter(view => view?.id && view.id !== 'window');
  return normalizedViews[0]?.id || defaultViews[0]?.id || 'summary';
}

export default defineComponent({
  name: 'ActivityRedirect',
  async mounted() {
    const settingsStore = useSettingsStore();
    const bucketsStore = useBucketsStore();

    await settingsStore.ensureLoaded();
    await bucketsStore.ensureLoaded();

    const host = resolveDefaultHost();
    if (host) {
      const date = get_today_with_offset(settingsStore.startOfDay);
      const viewId = resolveDefaultViewId();
      await this.$router.replace(
        `/activity/${encodeURIComponent(host)}/day/${date}/view/${encodeURIComponent(viewId)}`
      );
      return;
    }

    await this.$router.replace('/buckets');
  },
});
</script>
