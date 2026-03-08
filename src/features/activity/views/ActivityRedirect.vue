<template>
  <div class="aw-activity-redirect">
    Loading activity…
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useBucketsStore } from '~/features/buckets/store/buckets';
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

  return bucketsStore.hosts.find(isActivityHost) || bucketsStore.hosts.find(host => host && host !== 'unknown') || null;
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
      await this.$router.replace(`/activity/${encodeURIComponent(host)}`);
      return;
    }

    await this.$router.replace('/buckets');
  },
});
</script>
