<template>
<div>
  <!-- TODO: Make event-editor a global component backed by a Vuex store-->
  <!--       Currently, more than one event-editor on the same view can lead to multiple event-editors opening.-->
  <event-editor v-if="editable" :event="editableEvent" :bucket_id="bucket_id" :open="isEditorOpen" @update:open="onEditorOpenChange" @save="e => $emit('save', e)" @delete="removeEvent"></event-editor>
  <div class="aw-panel overflow-hidden">
    <div class="aw-card-header">
      <div>
        <h4 class="aw-card-title">Events</h4>
        <p class="aw-card-subtitle">Showing {{ displayed_events.length }} events <span v-if="events.length > displayed_events.length">(out of {{ events.length }})</span></p>
      </div>
      <button class="aw-btn aw-btn-sm aw-btn-secondary" type="button" @click="expandList"><span v-if="!isListExpanded">Expand list</span><span v-else>Condense list</span></button>
    </div>
    <ul class="aw-list-scroll" :class="isListExpanded ? 'aw-list-scroll-expanded' : ''">
      <li class="border-muted border-b px-4 py-3 last:border-b-0" v-for="event in displayed_events">
        <div class="flex flex-wrap items-center gap-2"><span class="aw-chip" :title="event.timestamp">
            <icon name="calendar"></icon>{{ event.timestamp  ? new Date(event.timestamp ).toLocaleString() : "" }}</span><span class="aw-chip">
            <icon name="clock"></icon>{{ friendlyduration(event.duration ) }}</span><span class="aw-chip" v-for="(val, key) in event.data">
            <icon name="tags"></icon>{{ key }}: {{ val }}</span>
          <button class="aw-btn aw-btn-sm aw-btn-outline" v-if="editable" type="button" @click="editEvent(event)">
            <icon name="edit"></icon>Edit
          </button>
        </div>
      </li>
    </ul>
  </div>
</div>
</template>

<script lang="ts">

import EventEditor from '~/features/events/components/EventEditor.vue';

export default {
  name: 'EventList',
  components: {
    'event-editor': EventEditor,
  },
  props: {
    bucket_id: String,
    events: Array,
    editable: {
      default: false,
      type: Boolean,
    },
  },
  data: function () {
    return {
      isListExpanded: false,
      limit: 100,
      editableEvent: null,
      isEditorOpen: false,
    };
  },
  computed: {
    displayed_events: function () {
      return (this.events || []).slice(0, this.limit);
    },
  },
  methods: {
    editEvent: function (event) {
      this.editableEvent = event;
      this.isEditorOpen = true;
    },
    onEditorOpenChange(open) {
      this.isEditorOpen = open;
      if (!open) {
        this.editableEvent = null;
      }
    },
    expandList: function () {
      this.isListExpanded = !this.isListExpanded;
      console.log('List should be expanding: ', this.isListExpanded);
    },
    removeEvent: function (_event) {
      // FIXME: Illegal mutation of prop, need to propagate upwards or move into vuex.
      //this.events = this.events.filter(e => e.id != event.id);
    },
  },
};
</script>
