<template lang="pug">
.rize-settings-card
  .card-header
    h4 Device Groupings
    p.text-muted Combine multiple computer hostnames into a single Device Dashboard to keep your Activity clean.

  .card-body
    .mb-3
      label.form-label Defined Device Groups
      .list-group.mb-3(v-if="Object.keys(deviceMappings).length > 0")
        .list-group-item.d-flex.justify-content-between.align-items-start(
          v-for="(hosts, groupName) in deviceMappings"
          :key="groupName"
        )
          .ms-2.me-auto
            .fw-bold {{ groupName }}
            small.text-muted {{ hosts.join(', ') }}
          button.btn.btn-sm.btn-outline-danger(@click="removeGroup(groupName)") Remove
      .text-muted.fst-italic(v-else) No custom device groups defined yet.

    .card.bg-light
      .card-body
        h6 Create New Group
        form(@submit.prevent="addGroup")
          .mb-3
            label.form-label Group Name (e.g. "My MacBook")
            input.form-control(v-model="newGroupName", required, placeholder="Enter a clean device name")

          .mb-3
            label.form-label Select Hostnames to Merge
            .form-check(v-for="host in availableHosts" :key="host")
              input.form-check-input(
                type="checkbox",
                :id="`host-${host}`",
                :value="host",
                v-model="newGroupHosts"
              )
              label.form-check-label(:for="`host-${host}`") {{ host }}
            .text-muted.small.mt-2(v-if="availableHosts.length === 0") All detected hosts are already grouped!

          button.btn.btn-primary(type="submit" :disabled="!newGroupName || newGroupHosts.length === 0") Create Group
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useSettingsStore } from '~/stores/settings';
import { useBucketsStore } from '~/stores/buckets';
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

<style scoped lang="scss">
.rize-settings-card {
  h4 {
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  .list-group-item {
    border-radius: 8px;
    margin-bottom: 8px;
    border: 1px solid #e2e2ec;
  }
}
</style>
