<template>
  <div>
    <event-editor
      v-if="editable"
      :bucket-id="bucketId"
      :event="editableEvent"
      :open="isEditorOpen"
      @update:open="onEditorOpenChange"
      @saved="onEventSaved"
      @deleted="onEventDeleted"
    />
    <div class="aw-panel overflow-hidden">
      <div class="aw-card-header">
        <div>
          <h4 class="aw-card-title">Events</h4>
          <p class="aw-card-subtitle">
            Showing {{ displayedEvents.length }} events
            <span v-if="events.length > displayedEvents.length">(out of {{ events.length }})</span>
          </p>
        </div>
        <ui-button
          class="aw-btn aw-btn-sm aw-btn-secondary"
          type="button"
          @click="isListExpanded = !isListExpanded"
        >
          {{ isListExpanded ? 'Condense list' : 'Expand list' }}
        </ui-button>
      </div>
      <ul class="aw-list-scroll" :class="isListExpanded ? 'aw-list-scroll-expanded' : ''">
        <li
          v-for="(event, eventIndex) in displayedEvents"
          :key="event.id ?? `${event.timestamp || 'event'}-${eventIndex}`"
          class="border-muted border-b px-4 py-3 last:border-b-0"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="aw-chip" :title="event.timestamp">
              <icon name="calendar" />
              {{ event.timestamp ? new Date(event.timestamp).toLocaleString() : '' }}
            </span>
            <span class="aw-chip">
              <icon name="clock" />{{ friendlyduration(event.duration) }}
            </span>
            <span v-for="(value, key) in event.data" :key="String(key)" class="aw-chip">
              <icon name="tags" />{{ key }}: {{ value }}
            </span>
            <ui-button
              v-if="editable"
              class="aw-btn aw-btn-sm aw-btn-outline"
              type="button"
              @click="editEvent(event)"
            >
              <icon name="edit" />Edit
            </ui-button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

import EventEditor from '~/features/buckets/components/EventEditor.vue';
import { friendlyduration } from '~/shared/lib/filters';
import type { IEvent } from '~/shared/lib/interfaces';

export default defineComponent({
  name: 'EventList',
  components: { EventEditor },
  props: {
    bucketId: {
      type: String,
      required: true,
    },
    events: {
      type: Array as PropType<IEvent[]>,
      default: () => [],
    },
    editable: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['saved', 'deleted'],
  data() {
    return {
      isListExpanded: false,
      limit: 100,
      editableEvent: null as IEvent | null,
      isEditorOpen: false,
    };
  },
  computed: {
    displayedEvents(): IEvent[] {
      return this.events.slice(0, this.limit);
    },
  },
  methods: {
    friendlyduration,
    editEvent(event: IEvent) {
      this.editableEvent = event;
      this.isEditorOpen = true;
    },
    onEditorOpenChange(open: boolean) {
      this.isEditorOpen = open;
      if (!open) this.editableEvent = null;
    },
    onEventSaved(event: IEvent) {
      this.$emit('saved', event);
    },
    onEventDeleted(event: IEvent | null) {
      if (event) this.$emit('deleted', event);
    },
  },
});
</script>
