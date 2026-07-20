<template>
  <app-modal
    :open="open && Boolean(event?.id)"
    :close-on-overlay="!operationPending"
    title="Edit event"
    panel-class="max-w-3xl"
    @update:open="onOpenChange"
  >
    <aw-alert v-if="operationError" show variant="danger">{{ operationError }}</aw-alert>
    <div v-if="!editedEvent" class="text-sm text-foreground-muted">Loading event...</div>
    <div v-else class="space-y-6">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="aw-card-muted">
          <dl class="space-y-3 text-sm">
            <div class="flex items-start justify-between gap-4">
              <dt class="font-medium text-foreground-muted">Bucket</dt>
              <dd class="text-right font-mono text-foreground-strong">{{ bucketId }}</dd>
            </div>
            <div class="flex items-start justify-between gap-4">
              <dt class="font-medium text-foreground-muted">ID</dt>
              <dd class="text-right font-mono text-foreground-strong">{{ event?.id }}</dd>
            </div>
            <div class="flex items-start justify-between gap-4">
              <dt class="font-medium text-foreground-muted">Duration</dt>
              <dd class="text-right text-foreground-strong">
                {{ friendlyduration(editedEvent.duration) }}
              </dd>
            </div>
          </dl>
        </div>
        <div class="grid gap-3">
          <div class="flex flex-col gap-1">
            <span class="aw-label">Start</span>
            <ui-input id="event-editor-start" v-model="start" class="aw-input" type="datetime-local" aria-label="Event start time" />
          </div>
          <div class="flex flex-col gap-1">
            <span class="aw-label">End</span>
            <ui-input id="event-editor-end" v-model="end" class="aw-input" type="datetime-local" aria-label="Event end time" />
          </div>
        </div>
      </div>
      <div class="space-y-3">
        <h4 class="aw-eyebrow">Event data</h4>
        <div
          v-for="(value, key) in editedEvent.data"
          :key="key"
          class="aw-form-kv-grid"
        >
          <ui-input
            class="h-10 w-full rounded-md border border-base bg-surface-muted px-3 text-sm text-foreground"
            :value="key"
            disabled
            type="text"
          />
          <div>
            <div
              v-if="typeof value === 'boolean'"
              class="flex items-center gap-2 text-sm text-foreground"
            >
              <ui-checkbox :id="`event-editor-value-${key}`" v-model="editedEvent.data[key]" class="aw-checkbox" :aria-label="String(key)" />
              <span>Enabled</span>
            </div>
            <ui-input
              v-else-if="typeof value === 'string'"
              v-model="editedEvent.data[key]"
              class="aw-input"
              type="text"
            />
            <ui-input
              v-else-if="typeof value === 'number'"
              v-model.number="editedEvent.data[key]"
              class="aw-input"
              type="number"
            />
            <ui-textarea
              v-else
              class="aw-textarea min-h-24"
              :value="formatComplexValue(value)"
              readonly
            />
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <ui-button
        class="aw-btn aw-btn-md aw-btn-danger mr-auto"
        type="button"
        :disabled="operationPending"
        @click="deleteAndClose"
      >
        <icon :class="deleting ? 'animate-spin' : ''" :name="deleting ? 'sync' : 'trash'" />
        <span>{{ deleting ? 'Deleting...' : 'Delete' }}</span>
      </ui-button>
      <ui-button
        class="aw-btn aw-btn-md aw-btn-secondary"
        type="button"
        :disabled="operationPending"
        @click="close"
      >
        <icon name="times" /><span>Cancel</span>
      </ui-button>
      <ui-button
        class="aw-btn aw-btn-md aw-btn-primary"
        type="button"
        :disabled="operationPending || !editedEvent"
        @click="saveAndClose"
      >
        <icon :class="saving ? 'animate-spin' : ''" :name="saving ? 'sync' : 'save'" />
        <span>{{ saving ? 'Saving...' : 'Save' }}</span>
      </ui-button>
    </template>
  </app-modal>
</template>

<script lang="ts">
import moment from 'moment';
import { defineComponent, type PropType } from 'vue';
import {
  deleteBucketEvent,
  fetchBucketEvent,
  replaceBucketEvent,
} from '~/features/buckets/lib/bucketsClient';
import { friendlyduration } from '~/shared/lib/filters';
import type { IEvent } from '~/shared/lib/interfaces';
import AppModal from '~/shared/ui/AppModal.vue';

export default defineComponent({
  name: 'EventEditor',
  components: { AppModal },
  props: {
    event: {
      type: Object as PropType<IEvent | null>,
      default: null,
    },
    bucketId: {
      type: String,
      required: true,
    },
    open: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'saved', 'deleted', 'update:open'],
  data() {
    return {
      editedEvent: null as IEvent | null,
      operationError: '',
      saving: false,
      deleting: false,
      loadRequestId: 0,
    };
  },
  computed: {
    operationPending(): boolean {
      return this.saving || this.deleting;
    },
    start: {
      get(): string {
        return this.editedEvent
          ? moment(this.editedEvent.timestamp).format('YYYY-MM-DDTHH:mm')
          : '';
      },
      set(value: string) {
        if (!this.editedEvent || !value) return;
        this.editedEvent.duration = moment(this.end).diff(value, 'seconds');
        this.editedEvent.timestamp = moment(value).toISOString();
      },
    },
    end: {
      get(): string {
        if (!this.editedEvent) return '';
        return moment(this.editedEvent.timestamp)
          .add(this.editedEvent.duration, 'seconds')
          .format('YYYY-MM-DDTHH:mm');
      },
      set(value: string) {
        if (!this.editedEvent || !value) return;
        this.editedEvent.duration = moment(value).diff(this.editedEvent.timestamp, 'seconds');
      },
    },
  },
  watch: {
    event() {
      if (this.open) void this.loadEvent();
    },
    open(open: boolean) {
      if (open) {
        void this.loadEvent();
      } else {
        this.resetEditor();
      }
    },
  },
  mounted() {
    if (this.open) void this.loadEvent();
  },
  beforeUnmount() {
    this.loadRequestId += 1;
  },
  methods: {
    friendlyduration,
    resetEditor() {
      this.loadRequestId += 1;
      this.editedEvent = null;
      this.operationError = '';
      this.saving = false;
      this.deleting = false;
    },
    async loadEvent() {
      const requestId = ++this.loadRequestId;
      this.operationError = '';
      const eventId = this.event?.id;
      if (eventId === undefined || eventId === null) {
        this.editedEvent = null;
        return;
      }
      try {
        const event = await fetchBucketEvent(this.bucketId, Number(eventId));
        if (requestId === this.loadRequestId) {
          this.editedEvent = {
            ...event,
            timestamp: moment(event.timestamp).toISOString(),
            duration: event.duration ?? 0,
            data: { ...event.data },
          };
        }
      } catch (error) {
        if (requestId !== this.loadRequestId) return;
        console.error('Failed to load event', error);
        this.operationError = 'Failed to load the event.';
        this.editedEvent = null;
      }
    },
    formatComplexValue(value: unknown): string {
      return JSON.stringify(value, null, 2);
    },
    onOpenChange(open: boolean) {
      if (!open && !this.operationPending) this.close();
    },
    close() {
      if (this.operationPending) return;
      const event = this.event;
      this.resetEditor();
      this.$emit('update:open', false);
      this.$emit('close', event);
    },
    async saveAndClose() {
      if (!this.editedEvent || this.operationPending) return;
      this.operationError = '';
      this.saving = true;
      try {
        const eventForApi = {
          ...this.editedEvent,
          timestamp: new Date(this.editedEvent.timestamp),
        };
        await replaceBucketEvent(this.bucketId, eventForApi);
        this.$emit('saved', this.editedEvent);
        this.saving = false;
        this.close();
      } catch (error) {
        console.error('Failed to save event', error);
        this.operationError = 'Failed to save the event. No changes were applied.';
        this.saving = false;
      }
    },
    async deleteAndClose() {
      const eventId = this.event?.id;
      if (eventId === undefined || eventId === null || this.operationPending) return;
      this.operationError = '';
      this.deleting = true;
      try {
        await deleteBucketEvent(this.bucketId, Number(eventId));
        const deletedEvent = this.event;
        this.$emit('deleted', deletedEvent);
        this.deleting = false;
        this.close();
      } catch (error) {
        console.error('Failed to delete event', error);
        this.operationError = 'Failed to delete the event.';
        this.deleting = false;
      }
    },
  },
});
</script>
