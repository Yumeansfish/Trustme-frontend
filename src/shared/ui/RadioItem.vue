<template>
  <input
    v-bind="radioAttrs"
    :class="radioClasses"
    :checked="String(modelValue) === String(value)"
    :value="value"
    type="radio"
    @change="onChange"
  >
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'UiRadioItem',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number, Boolean],
      default: undefined,
    },
    value: {
      type: [String, Number, Boolean],
      required: true,
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { attrs, emit }) {
    const radioClasses = computed(() => attrs.class);

    const radioAttrs = computed(() => {
      const baseAttrs = { ...attrs };
      delete baseAttrs.class;
      return baseAttrs;
    });

    const onChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.checked) {
        emit('update:modelValue', props.value);
      }
      emit('change', event);
    };

    return {
      onChange,
      radioAttrs,
      radioClasses,
    };
  },
});
</script>
