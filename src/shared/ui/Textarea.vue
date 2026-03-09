<template>
  <textarea
    v-bind="textareaAttrs"
    :class="textareaClasses"
    :value="modelValue"
    @input="onInput"
    @change="$emit('change', $event)"
  ></textarea>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'UiTextarea',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { attrs, emit }) {
    const textareaClasses = computed(() => ['aw-textarea', attrs.class]);
    const textareaAttrs = computed(() => {
      const baseAttrs = { ...attrs };
      delete baseAttrs.class;
      return baseAttrs;
    });

    const onInput = (event: Event) => {
      emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
    };

    return {
      onInput,
      textareaAttrs,
      textareaClasses,
    };
  },
});
</script>
