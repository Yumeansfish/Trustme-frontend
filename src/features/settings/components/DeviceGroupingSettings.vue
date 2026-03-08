<template>
<div class="space-y-4">
  <div class="space-y-1">
    <h4 class="aw-subtitle">Device Groupings</h4>
    <p class="text-sm leading-6 text-foreground-muted">Combine multiple computer hostnames into a single Device Dashboard to keep your Activity clean.</p>
  </div>
  <div class="space-y-3">
    <div>
      <label class="aw-label">Defined Device Groups</label>
      <div class="mt-3 space-y-2" v-if="Object.keys(deviceMappings).length > 0">
        <div class="aw-card flex items-start justify-between gap-4" v-for="(hosts, groupName) in deviceMappings" :key="groupName">
          <div class="min-w-0 space-y-1">
            <div class="text-sm font-semibold text-foreground-strong">{{ groupName }}</div>
            <div class="text-sm text-foreground-muted">{{ hosts.join(', ') }}</div>
          </div>
          <button class="aw-btn aw-btn-outline aw-btn-sm" type="button" @click="removeGroup(groupName)">Remove</button>
        </div>
      </div>
      <div class="mt-3 text-sm italic text-foreground-muted" v-else>No custom device groups defined yet.</div>
    </div>
    <div class="aw-card-muted space-y-4">
      <h6 class="text-sm font-semibold text-foreground-strong">Create New Group</h6>
      <form class="space-y-4" @submit.prevent="addGroup">
        <label class="flex flex-col gap-1"><span class="aw-label">Group Name (e.g. "My MacBook")</span>
          <input class="aw-input" v-model="newGroupName" required placeholder="Enter a clean device name">
        </label>
        <div class="space-y-2">
          <label class="aw-label">Select Hostnames to Merge</label>
          <label class="flex items-center gap-3 rounded-lg border border-base bg-surface p-3 text-sm text-foreground" v-for="host in availableHosts" :key="host">
            <input class="aw-checkbox" type="checkbox" :id="`host-${host}`" :value="host" v-model="newGroupHosts"><span>{{ host }}</span>
          </label>
          <div class="text-sm text-foreground-muted" v-if="availableHosts.length === 0">All detected hosts are already grouped!</div>
        </div>
        <button class="aw-btn aw-btn-primary" type="submit" :disabled="!newGroupName || newGroupHosts.length === 0">Create Group</button>
      </form>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useSettingsStore } from '~/features/settings/store/settings';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import _ from 'lodash';

export default defineComponent({
  name: 'DeviceGroupingSettings',
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
    availableHosts() {
      const bucketsStore = useBucketsStore();
      const allHosts = bucketsStore.hosts;

      // Determine which hosts are already assigned to a group
      const assignedHosts = new Set<string>();
      _.each(this.deviceMappings, hosts => {
        hosts.forEach((h: string) => assignedHosts.add(h));
      });

      // Filter to only show hosts that haven't been grouped yet
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
      // Temporarily skip confirmation for debugging
      // if (!confirm(`Are you sure you want to remove the group "${groupName}"?`)) return;

      const settingsStore = useSettingsStore();
      const currentMappings = { ...this.deviceMappings };

      delete currentMappings[groupName];

      await settingsStore.update({ deviceMappings: currentMappings });
    },
  },
});
</script>
