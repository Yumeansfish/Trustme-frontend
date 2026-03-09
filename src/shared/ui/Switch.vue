<template>
  <label class="aw-switch" :class="attrs.class">
    <input
      v-bind="switchAttrs"
      class="aw-switch-input"
      type="checkbox"
      :checked="modelValue"
      @change="onChange"
    >
    <span class="aw-switch-track">
      <span class="aw-switch-thumb"></span>
    </span>
  </label>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'UiSwitch',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(_props, { attrs, emit }) {
    const switchAttrs = computed(() => {
      const baseAttrs = { ...attrs };
      delete baseAttrs.class;
      return baseAttrs;
    });

    const onChange = (event: Event) => {
      emit('update:modelValue', (event.target as HTMLInputElement).checked);
      emit('change', event);
    };

    return {
      attrs,
      onChange,
      switchAttrs,
    };
  },
});
</script>
