<template lang="pug">
app-modal(
  :open="open && !!event && !!event.id"
  title="Edit event"
  panel-class="max-w-3xl"
  @update:open="onOpenChange"
)
  div(v-if="!editedEvent").text-sm.text-slate-500 Loading event...

  div(v-else).space-y-6
    div.grid.gap-4(class="md:grid-cols-2")
      div.rounded-xl.border.border-slate-200.bg-slate-50.p-4
        dl.space-y-3.text-sm
          div.flex.items-start.justify-between.gap-4
            dt.font-medium.text-slate-500 Bucket
            dd.text-right.font-mono.text-slate-900 {{ bucket_id }}
          div.flex.items-start.justify-between.gap-4
            dt.font-medium.text-slate-500 ID
            dd.text-right.font-mono.text-slate-900 {{ event.id }}
          div.flex.items-start.justify-between.gap-4
            dt.font-medium.text-slate-500 Duration
            dd.text-right.text-slate-900 {{ friendlyduration(editedEvent.duration) }}

      div.grid.gap-3
        label.flex.flex-col.gap-1.text-sm.font-medium.text-slate-700
          span Start
          input.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
            v-model="start"
            type="datetime-local"
            class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          )
        label.flex.flex-col.gap-1.text-sm.font-medium.text-slate-700
          span End
          input.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
            v-model="end"
            type="datetime-local"
            class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          )

    div.space-y-3
      h4.text-sm.font-semibold.uppercase.text-slate-500(class="tracking-[0.18em]") Event data
      div.grid.gap-3(v-for="(value, key) in editedEvent.data" :key="key" class="md:grid-cols-[180px_minmax(0,1fr)] md:items-center")
        input.h-10.w-full.rounded-md.border.border-slate-200.bg-slate-100.px-3.text-sm.text-slate-600(
          :value="key"
          disabled
          type="text"
        )
        div
          label.flex.items-center.gap-2.text-sm.text-slate-700(v-if="typeof value === 'boolean'")
            input.h-4.w-4.rounded.border-slate-300.text-slate-900(
              v-model="editedEvent.data[key]"
              type="checkbox"
              class="focus:ring-slate-400"
            )
            span Enabled
          input.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
            v-else-if="typeof value === 'string'"
            v-model="editedEvent.data[key]"
            type="text"
            class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          )
          input.h-10.w-full.rounded-md.border.border-slate-300.bg-white.px-3.text-sm.text-slate-900.shadow-sm.outline-none.transition(
            v-else-if="typeof value === 'number'"
            v-model.number="editedEvent.data[key]"
            type="number"
            class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          )
          textarea.min-h-24.w-full.rounded-md.border.border-slate-300.bg-white.px-3.py-2.text-sm.text-slate-900.shadow-sm.outline-none.transition(
            v-else
            :value="formatComplexValue(value)"
            readonly
            class="focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          )
  template(#footer)
    button.mr-auto.inline-flex.h-9.items-center.justify-center.gap-2.rounded-md.border.border-rose-500.bg-rose-600.px-4.text-sm.font-medium.text-white.transition(
      type="button"
      @click="deleteAndClose"
      class="hover:bg-rose-700"
    )
      icon(name="trash")
      span Delete
    button.inline-flex.h-9.items-center.justify-center.gap-2.rounded-md.border.border-slate-300.bg-white.px-4.text-sm.font-medium.text-slate-700.transition(
      type="button"
      @click="close"
      class="hover:bg-slate-100"
    )
      icon(name="times")
      span Cancel
    button.inline-flex.h-9.items-center.justify-center.gap-2.rounded-md.border.border-slate-900.bg-slate-900.px-4.text-sm.font-medium.text-white.transition(
      type="button"
      @click="saveAndClose"
      class="hover:bg-slate-800"
    )
      icon(name="save")
      span Save
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
import AppModal from '~/components/ui/AppModal.vue';


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
