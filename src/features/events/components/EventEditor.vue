<template>
<app-modal :open="open && !!event && !!event.id" title="Edit event" panel-class="max-w-3xl" @update:open="onOpenChange">
  <div class="text-sm text-foreground-muted" v-if="!editedEvent">Loading event...</div>
  <div class="space-y-6" v-else>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="aw-card-muted">
        <dl class="space-y-3 text-sm">
          <div class="flex items-start justify-between gap-4">
            <dt class="font-medium text-foreground-muted">Bucket</dt>
            <dd class="text-right font-mono text-foreground-strong">{{ bucket_id }}</dd>
          </div>
          <div class="flex items-start justify-between gap-4">
            <dt class="font-medium text-foreground-muted">ID</dt>
            <dd class="text-right font-mono text-foreground-strong">{{ event.id }}</dd>
          </div>
          <div class="flex items-start justify-between gap-4">
            <dt class="font-medium text-foreground-muted">Duration</dt>
            <dd class="text-right text-foreground-strong">{{ friendlyduration(editedEvent.duration) }}</dd>
          </div>
        </dl>
      </div>
      <div class="grid gap-3">
        <label class="flex flex-col gap-1"><span class="aw-label">Start</span>
          <input class="aw-input" v-model="start" type="datetime-local">
        </label>
        <label class="flex flex-col gap-1"><span class="aw-label">End</span>
          <input class="aw-input" v-model="end" type="datetime-local">
        </label>
      </div>
    </div>
    <div class="space-y-3">
      <h4 class="aw-eyebrow">Event data</h4>
      <div class="aw-form-kv-grid" v-for="(value, key) in editedEvent.data" :key="key">
        <input class="h-10 w-full rounded-md border border-base bg-surface-muted px-3 text-sm text-foreground" :value="key" disabled type="text">
        <div>
          <label class="flex items-center gap-2 text-sm text-foreground" v-if="typeof value === 'boolean'">
            <input class="aw-checkbox" v-model="editedEvent.data[key]" type="checkbox"><span>Enabled</span>
          </label>
          <input class="aw-input" v-else-if="typeof value === 'string'" v-model="editedEvent.data[key]" type="text">
          <input class="aw-input" v-else-if="typeof value === 'number'" v-model.number="editedEvent.data[key]" type="number">
          <textarea class="aw-textarea min-h-24" v-else :value="formatComplexValue(value)" readonly></textarea>
        </div>
      </div>
    </div>
  </div>
  <template #footer>
    <button class="aw-btn aw-btn-md aw-btn-danger mr-auto" type="button" @click="deleteAndClose">
      <icon name="trash"></icon><span>Delete</span>
    </button>
    <button class="aw-btn aw-btn-md aw-btn-secondary" type="button" @click="close">
      <icon name="times"></icon><span>Cancel</span>
    </button>
    <button class="aw-btn aw-btn-md aw-btn-primary" type="button" @click="saveAndClose">
      <icon name="save"></icon><span>Save</span>
    </button>
  </template>
</app-modal>
</template>

<script lang="ts">
// This EventEditor can be used to edit events in a specific bucket.
//
// It is used in:
//  - Stopwatch
//  - Bucket viewer
//  - Timeline (on event-click)
//  - Search (soon)

import moment from 'moment';
import AppModal from '~/shared/ui/AppModal.vue';


export default {
  name: 'EventEditor',
  components: {
    AppModal,
  },
  props: {
    event: { type: Object },
    bucket_id: { type: String, required: true },
    open: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'delete', 'save', 'update:open'],
  data() {
    return {
      editedEvent: null,
    };
  },
  computed: {
    start: {
      get: function () {
        return this.editedEvent ? moment(this.editedEvent.timestamp).format('YYYY-MM-DDTHH:mm') : '';
      },
      set: function (dt) {
        if (!this.editedEvent || !dt) {
          return;
        }
        // Duration needs to be set first since otherwise the computed for end will use the new timestamp
        this.editedEvent.duration = moment(this.end).diff(dt, 'seconds');
        this.editedEvent.timestamp = new Date(dt);
      },
    },
    end: {
      get: function () {
        if (!this.editedEvent) {
          return '';
        }
        const end = moment(this.editedEvent.timestamp).add(this.editedEvent.duration, 'seconds');
        return end.format('YYYY-MM-DDTHH:mm');
      },
      set: function (dt) {
        if (!this.editedEvent || !dt) {
          return;
        }
        this.editedEvent.duration = moment(dt).diff(this.editedEvent.timestamp, 'seconds');
      },
    },
  },
  watch: {
    async event() {
      if (this.open) {
        await this.getEvent();
      }
    },
    async open(newValue) {
      if (newValue) {
        await this.getEvent();
      } else {
        this.editedEvent = null;
      }
    },
  },
  mounted: async function () {
    if (this.open) {
      await this.getEvent();
    }
  },
  methods: {
    async save() {
      // This emit needs to be called first, otherwise it won't occur for some reason
      // FIXME: but what if the replace fails? Then UI will incorrectly think event was replaced?
      this.$emit('save', this.editedEvent);
      await this.$aw.replaceEvent(this.bucket_id, this.editedEvent);
    },
    async delete_() {
      // This emit needs to be called first, otherwise it won't occur for some reason
      // FIXME: but what if the replace fails? Then UI will incorrectly think event was deleted?
      this.$emit('delete', this.event);
      await this.$aw.deleteEvent(this.bucket_id, this.event.id);
    },
    async getEvent() {
      if (this.bucket_id && this.event && this.event.id) {
        this.editedEvent = await this.$aw.getEvent(this.bucket_id, this.event.id);
      } else {
        this.editedEvent = null;
      }
    },
    formatComplexValue(value) {
      return JSON.stringify(value, null, 2);
    },
    onOpenChange(open) {
      if (!open) {
        this.close();
      }
    },
    close() {
      this.editedEvent = null;
      this.$emit('update:open', false);
      this.$emit('close', this.event);
    },
    async saveAndClose() {
      await this.save();
      this.close();
    },
    async deleteAndClose() {
      await this.delete_();
      this.close();
    },
  },
};
</script>
