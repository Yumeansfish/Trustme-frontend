<template>
<div>
  <div class="aw-tree-row py-3">
    <div class="min-w-0 flex-1">
      <span class="text-foreground-strong font-semibold">{{ event.data.label || 'No label' }}</span>
      <span class="text-foreground-subtle mx-2">&middot;</span>
      <span v-if="event.data.running">
        Running for <span :title="event.timestamp">{{ friendlyduration(event.data.running ? (now - event.timestamp) / 1000 : event.duration ) }}</span>
        &nbsp;(Started {{ shorttime(event.timestamp ) }})
      </span>
      <span v-else>
        Started <span :title="event.timestamp">{{ event.timestamp ? new Date(event.timestamp ).toLocaleString() : "" }}</span>
        &nbsp;({{ friendlyduration(event.data.running ? (now - event.timestamp) / 1000 : event.duration ) }})
      </span>
    </div>
    <div class="flex items-center gap-2">
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary" v-if="event.data.running" type="button" @click="stop">
        <icon name="stop"></icon>
        Stop
      </ui-button>
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary" v-if="!event.data.running" type="button" @click="$emit('new')">
        <icon name="play"></icon>
        Start new
      </ui-button>
      <ui-button class="aw-btn aw-btn-sm aw-btn-outline" type="button" @click="isEditorOpen = true">
        <icon name="edit"></icon>
        Edit
      </ui-button>
    </div>
  </div>
  <event-editor :event="event" :bucket_id="bucket_id" :open="isEditorOpen" @update:open="isEditorOpen = $event" @save="save" @delete="delete_"></event-editor>
</div>
</template>

<script lang="ts">
import moment from 'moment';

import EventEditor from '~/features/events/components/EventEditor.vue';

export default {
  name: 'StopwatchEntry',
  components: {
    'event-editor': EventEditor,
  },
  props: {
    event: Object,
    bucket_id: String,
    now: {
      type: moment,
      default: moment(),
    },
  },
  data() {
    return {
      isEditorOpen: false,
    };
  },
  methods: {
    stop: async function () {
      const new_event = JSON.parse(JSON.stringify(this.event));
      new_event.data.running = false;
      new_event.duration = moment().diff(moment(new_event.timestamp)) / 1000;
      await this.$aw.replaceEvent(this.bucket_id, new_event);
      this.$emit('update', new_event);
    },
    save: async function (new_event) {
      this.$emit('update', new_event);
    },
    delete_: async function (new_event) {
      this.$emit('delete', new_event);
    },
  },
};
</script>
