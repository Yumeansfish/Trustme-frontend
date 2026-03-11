<template>
  <article class="aw-settings-card">
    <div :class="['aw-settings-card-top', { 'aw-settings-card-top-single': !$slots.control }]">
      <div class="flex items-start gap-4">
        <span v-if="icon" class="aw-settings-card-icon">
          <icon :name="icon" class="h-5 w-5"></icon>
        </span>
        <div class="min-w-0 space-y-2">
          <div class="space-y-1">
            <h4 class="text-xl font-semibold text-foreground-strong">{{ title }}</h4>
            <p v-if="description" class="aw-caption max-w-xl">{{ description }}</p>
          </div>
          <slot name="meta"></slot>
        </div>
      </div>
      <div v-if="$slots.control" class="aw-settings-card-control">
        <slot name="control"></slot>
      </div>
    </div>

    <div v-if="$slots.default" class="aw-settings-card-body">
      <slot></slot>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SettingsCard',
  props: {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
  },
});
</script>
