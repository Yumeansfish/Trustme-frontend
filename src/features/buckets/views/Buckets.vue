<template>
<div class="space-y-6">
  <h2 class="aw-section-title">Buckets</h2>
  <aw-alert show>Are you looking to collect more data? Check out <a class="aw-link" href="https://activitywatch.readthedocs.io/en/latest/watchers.html">the docs</a> for more watchers.</aw-alert>
  <div class="aw-card space-y-4" v-for="device in bucketsStore.bucketsByDevice" :key="device.hostname || device.device_id">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3">
        <div class="bg-surface-subtle text-foreground flex h-10 w-10 items-center justify-center rounded-full">
          <icon v-if="device.hostname === 'unknown'" name="question"></icon>
          <icon v-else name="desktop"></icon>
        </div>
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <b class="text-foreground-strong text-base">{{ device.hostname }}</b>
            <span class="aw-chip" v-if="serverStore.info.hostname == device.hostname">the current device</span>
          </div>
          <div class="text-foreground-muted text-sm">
            <div v-if="device.hostname !== device.device_id">ID: {{ device.id }}</div>
            <div>Last updated:&nbsp;
              <time :class="isRecent(device.last_updated) ? 'text-success' : ''" :datetime="device.last_updated" :title="device.last_updated">{{ device.last_updated ? new Date(device.last_updated).toLocaleString() : "" }}</time>
            </div>
            <div>First seen:&nbsp;
              <time :datetime="device.first_seen" :title="device.first_seen">{{ device.first_seen ? new Date(device.first_seen).toLocaleString() : "" }}</time>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="aw-table">
        <thead>
          <tr>
            <th>Bucket ID</th>
            <th>Hostname</th>
            <th>Updated</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bucket in device.buckets" :key="bucket.id">
            <td class="text-foreground-strong font-medium">{{ bucket.id }}</td>
            <td>{{ bucket.hostname }}</td>
            <td><span :class="isRecent(bucket.last_updated) ? 'text-success' : ''">{{ bucket.last_updated ? new Date(bucket.last_updated).toLocaleString() : "" }}</span></td>
            <td>
              <div class="flex flex-wrap justify-end gap-2">
                <router-link class="aw-btn aw-btn-sm aw-btn-primary" :to="'/buckets/' + bucket.id">
                  <icon name="folder-open"></icon>
                  Open
                </router-link>
                <a class="aw-btn aw-btn-sm aw-btn-secondary" :href="$aw.baseURL + '/api/0/buckets/' + bucket.id + '/export'" :download="'aw-bucket-export-' + bucket.id + '.json'" title="Export bucket to JSON">
                  <icon name="download"></icon>
                  JSON
                </a>
                <button class="aw-btn aw-btn-sm aw-btn-secondary" type="button" @click="export_csv(bucket.id)">
                  <icon name="download"></icon>
                  CSV
                </button>
                <button class="aw-btn aw-btn-sm aw-btn-danger" type="button" @click="openDeleteBucketModal(bucket.id)">
                  <icon name="trash"></icon>
                  Delete
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="space-y-2" v-if="runChecks(device).length > 0">
      <div class="text-foreground flex items-start gap-2 text-sm" v-for="msg in runChecks(device)">
        <icon class="text-warning mt-0.5" name="exclamation-triangle"></icon>
        <span>{{ msg }}</span>
      </div>
    </div>
  </div>
  <div class="space-y-3">
    <h3 class="aw-subtitle">Import and export buckets</h3>
    <div class="grid gap-4 lg:grid-cols-2">
      <div class="aw-card space-y-3">
        <h4 class="text-foreground-strong text-base font-semibold">Import buckets</h4>
        <aw-alert v-if="import_error" show variant="danger" dismissible>{{ import_error }}</aw-alert>
        <input class="aw-input" type="file" accept="application/json" @change="import_file = $event.target.files?.[0] || null">
        <div class="text-foreground-muted flex items-center gap-2 text-sm" v-if="import_file">
          <icon name="spinner" pulse></icon>
          <span>Importing selected file…</span>
        </div>
        <p class="aw-caption">
          A valid file to import is a JSON file from either an export of a single bucket or an export from multiple buckets.
          If there are buckets with the same name the import will fail.
        </p>
      </div>
      <div class="aw-card space-y-3">
        <h4 class="text-foreground-strong text-base font-semibold">Export buckets</h4>
        <a class="aw-btn aw-btn-md aw-btn-secondary" :href="$aw.baseURL + '/api/0/export'" :download="'aw-bucket-export.json'" title="Export bucket to JSON">
          <icon name="download"></icon>
          Export all buckets as JSON
        </a>
      </div>
    </div>
  </div>
  <div class="aw-divider"></div>
  <aw-devonly reason="This section is still under development">
    <h2 class="text-foreground-strong p-2 text-lg font-semibold">Tools</h2>
    <div class="aw-divider"></div>
    <aw-bucket-validate class="p-2"></aw-bucket-validate>
    <div class="aw-divider"></div>
    <aw-bucket-merge class="p-2"></aw-bucket-merge>
  </aw-devonly>
</div>
</template>

<script lang="ts">

import _ from 'lodash';
import Papa from 'papaparse';
import moment from 'moment';
import { useDialog } from '~/shared/composables/useDialog';

import { useServerStore } from '~/shared/stores/server';
import { useBucketsStore } from '~/features/buckets/store/buckets';

export default {
  name: 'Buckets',
  components: {
    'aw-bucket-merge': () => import('~/features/buckets/components/BucketMerge.vue'),
    'aw-bucket-validate': () => import('~/features/buckets/components/BucketValidate.vue'),
  },
  data() {
    return {
      moment,
      bucketsStore: useBucketsStore(),
      serverStore: useServerStore(),

      import_file: null,
      import_error: null,
      fields: [
        { key: 'id', label: 'Bucket ID', sortable: true },
        { key: 'hostname', sortable: true },
        { key: 'last_updated', label: 'Updated', sortable: true },
        { key: 'actions', label: '' },
      ],
    };
  },
  watch: {
    import_file: async function (_new_value, _old_value) {
      if (this.import_file != null) {
        console.log('Importing file');
        try {
          await this.importBuckets(this.import_file);
          console.log('Import successful');
          this.import_error = null;
        } catch (err) {
          console.log('Import failed');
          // TODO: Make aw-server report error message so it can be shown in the web-ui
          this.import_error = 'Import failed, see aw-server logs for more info';
        }
        // We need to reload buckets even if we fail because imports can be partial
        // (first bucket succeeds, second fails for example when importing multiple)
        await this.bucketsStore.loadBuckets();
        this.import_file = null;
      }
    },
  },
  mounted: async function () {
    // load or reload buckets on mount
    await this.bucketsStore.loadBuckets();
  },
  methods: {
    isRecent: function (date) {
      return moment().diff(date) / 1000 < 120;
    },
    runChecks: function (device) {
      const checks = [
        {
          msg: () => {
            return `Device known by several hostnames: ${device.hostnames}`;
          },
          failed: () => device.hostnames.length > 1,
        },
        {
          msg: () => {
            return `Device known by several IDs: ${device.device_ids}`;
          },
          failed: () => device.device_ids.length > 1,
        },
        {
          msg: () => {
            return `Device is a special device, unattributed to a hostname, or not assigned a device ID.`;
          },
          failed: () => _.isEqual(device.hostnames, ['unknown']),
        },
        //{
        //  msg: () => 'just a test',
        //  failed: () => true,
        //},
      ];
      const failedChecks = _.filter(checks, c => c.failed());
      return _.map(failedChecks, c => c.msg());
    },
    openDeleteBucketModal: async function (bucketId: string) {
      const { confirm } = useDialog();
      const shouldDelete = await confirm({
        title: 'Delete bucket',
        description: `Delete bucket "${bucketId}" permanently? This cannot be undone.`,
        confirmText: 'Delete bucket',
        cancelText: 'Cancel',
      });
      if (!shouldDelete) {
        return;
      }
      await this.deleteBucket(bucketId);
    },
    deleteBucket: async function (bucketId: string) {
      await this.bucketsStore.deleteBucket({ bucketId });
    },
    importBuckets: async function (importFile) {
      const formData = new FormData();
      formData.append('buckets.json', importFile);
      const headers = { 'Content-Type': 'multipart/form-data' };
      return this.$aw.req.post('/0/import', formData, { headers });
    },

    async export_csv(bucketId: string) {
      const bucket = await this.bucketsStore.getBucketWithEvents({ id: bucketId });
      const events = bucket.events;
      const datakeys = Object.keys(events[0].data);
      const columns = ['timestamp', 'duration'].concat(datakeys);
      const data = events.map(e => {
        return Object.assign(
          { timestamp: e.timestamp, duration: e.duration },
          Object.fromEntries(datakeys.map(k => [k, e.data[k]]))
        );
      });
      const csv = Papa.unparse(data, { columns, header: true });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aw-events-export-${bucketId}-${new Date()
        .toISOString()
        .substring(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  },
};
</script>
