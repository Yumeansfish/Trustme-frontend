<template>
  <settings-card
    title="Device Groupings"
    description="Combine multiple hostnames into one cleaner device view."
    icon="desktop"
  >
    <template #meta>
      <div class="flex flex-wrap gap-2">
        <span class="aw-chip">{{ groupCountLabel }}</span>
        <span class="aw-chip">{{ availableHosts.length }} Unassigned</span>
      </div>
    </template>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section class="aw-settings-subpanel space-y-4">
        <div class="space-y-1">
          <h5 class="text-base font-semibold text-foreground-strong">Current Groups</h5>
          <p class="aw-caption">Keep related machines under a single device dashboard.</p>
        </div>

        <div v-if="groupNames.length > 0" class="space-y-3">
          <div
            v-for="groupName in groupNames"
            :key="groupName"
            class="rounded-2xl border border-base bg-surface p-4 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 space-y-2">
                <div class="text-sm font-semibold text-foreground-strong">{{ groupName }}</div>
                <div class="flex flex-wrap gap-2">
                  <span v-for="host in deviceMappings[groupName]" :key="host" class="aw-chip">
                    {{ host }}
                  </span>
                </div>
              </div>
              <ui-button
                class="aw-btn aw-btn-outline aw-btn-sm shrink-0"
                type="button"
                @click="removeGroup(groupName)"
              >
                Remove
              </ui-button>
            </div>
          </div>
        </div>

        <div v-else class="aw-card-muted py-5 text-center text-sm text-foreground-muted">
          No custom device groups yet.
        </div>
      </section>

      <section class="aw-settings-subpanel space-y-4">
        <div class="space-y-1">
          <h5 class="text-base font-semibold text-foreground-strong">Create New Group</h5>
          <p class="aw-caption">Select the hosts that should appear as one shared device.</p>
        </div>

        <form class="space-y-4" @submit.prevent="addGroup">
          <label class="block space-y-2">
            <span class="aw-label">Group Name</span>
            <ui-input
              v-model="newGroupName"
              class="aw-settings-field"
              required
              placeholder="My MacBook"
            />
          </label>

          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <span class="aw-label">Hostnames</span>
              <span class="aw-caption">{{ newGroupHosts.length }} selected</span>
            </div>

            <div v-if="availableHosts.length > 0" class="space-y-3">
              <label v-for="host in availableHosts" :key="host" class="aw-settings-host-option">
                <ui-checkbox
                  :id="`host-${host}`"
                  v-model="newGroupHosts"
                  class="aw-checkbox"
                  :value="host"
                />
                <div class="min-w-0">
                  <div class="text-sm font-medium text-foreground-strong">{{ host }}</div>
                  <div class="text-xs text-foreground-muted">Detected watcher hostname</div>
                </div>
              </label>
            </div>

            <div v-else class="aw-card-muted py-5 text-center text-sm text-foreground-muted">
              All detected hosts are already grouped.
            </div>
          </div>

          <div class="flex justify-end">
            <ui-button
              class="aw-btn aw-btn-stopwatch aw-btn-md"
              type="submit"
              :disabled="!newGroupName || newGroupHosts.length === 0"
            >
              Create Group
            </ui-button>
          </div>
        </form>
      </section>
    </div>
  </settings-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import _ from 'lodash';

import { useSettingsStore } from '~/features/settings/store/settings';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import SettingsCard from '~/features/settings/components/SettingsCard.vue';

export default defineComponent({
  name: 'DeviceGroupingSettings',
  components: {
    SettingsCard,
  },
  data() {
    return {
      newGroupName: '',
      newGroupHosts: [] as string[],
    };
  },
  computed: {
    deviceMappings() {
      const settingsStore = useSettingsStore();
      return settingsStore.deviceMappings || {};
    },
    groupNames() {
      return Object.keys(this.deviceMappings);
    },
    groupCountLabel() {
      const count = this.groupNames.length;
      return count === 1 ? '1 Group' : `${count} Groups`;
    },
    availableHosts() {
      const bucketsStore = useBucketsStore();
      const allHosts = bucketsStore.hosts;

      const assignedHosts = new Set<string>();
      _.each(this.deviceMappings, hosts => {
        hosts.forEach((h: string) => assignedHosts.add(h));
      });

      return allHosts.filter(h => h !== 'unknown' && !assignedHosts.has(h));
    },
  },
  methods: {
    async addGroup() {
      if (!this.newGroupName || this.newGroupHosts.length === 0) return;

      const settingsStore = useSettingsStore();
      const currentMappings = { ...this.deviceMappings };

      currentMappings[this.newGroupName] = [...this.newGroupHosts];

      await settingsStore.update({ deviceMappings: currentMappings });

      this.newGroupName = '';
      this.newGroupHosts = [];
    },
    async removeGroup(groupName: string) {
      const settingsStore = useSettingsStore();
      const currentMappings = { ...this.deviceMappings };

      delete currentMappings[groupName];

      await settingsStore.update({ deviceMappings: currentMappings });
    },
  },
});
</script>
