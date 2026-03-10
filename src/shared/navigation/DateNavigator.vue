<template>
  <div class="aw-pill-control">
    <ui-button
      class="aw-icon-button h-7 w-7 rounded-full disabled:cursor-not-allowed disabled:opacity-40"
      type="button"
      :disabled="disablePrevious"
      @click="$emit('previous')"
    >
      <icon class="h-3 w-3" name="chevron-left"></icon>
    </ui-button>
    <label
      class="text-foreground-muted hover:text-foreground-strong relative inline-flex h-7 w-9 cursor-pointer items-center justify-center transition"
      :title="modelValue"
    >
      <icon class="h-3.5 w-3.5" name="calendar"></icon>
      <ui-input
        class="absolute inset-0 cursor-pointer opacity-0"
        type="date"
        :value="modelValue"
        :min="min"
        :max="max"
        @change="onDateInputChange"
      />
    </label>
    <ui-button
      class="aw-icon-button h-7 w-7 rounded-full disabled:cursor-not-allowed disabled:opacity-40"
      type="button"
      :disabled="disableNext"
      @click="$emit('next')"
    >
      <icon class="h-3 w-3" name="chevron-right"></icon>
    </ui-button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'DateNavigator',
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    min: {
      type: String,
      default: '',
    },
    max: {
      type: String,
      default: '',
    },
    disablePrevious: {
      type: Boolean,
      default: false,
    },
    disableNext: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['next', 'previous', 'select', 'update:modelValue'],
  methods: {
    onDateInputChange(event: Event) {
      const value = (event.target as HTMLInputElement).value;
      if (!value) return;

      this.$emit('update:modelValue', value);
      this.$emit('select', value);
    },
  },
});
</script>
