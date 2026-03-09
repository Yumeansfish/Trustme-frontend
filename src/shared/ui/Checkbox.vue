<template>
  <input
    v-bind="checkboxAttrs"
    :class="checkboxClasses"
    :checked="checkedValue"
    :value="value"
    type="checkbox"
    @change="onChange"
  >
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'UiCheckbox',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [Boolean, Array],
      default: false,
    },
    value: {
      type: [String, Number, Boolean],
      default: undefined,
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { attrs, emit }) {
    const checkboxClasses = computed(() => ['aw-checkbox', attrs.class]);
    const checkedValue = computed(() => {
      if (Array.isArray(props.modelValue)) {
        return props.modelValue.some(item => String(item) === String(props.value));
      }
      return Boolean(props.modelValue);
    });

    const checkboxAttrs = computed(() => {
      const baseAttrs = { ...attrs };
      delete baseAttrs.class;
      return baseAttrs;
    });

    const onChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (Array.isArray(props.modelValue)) {
        const nextValue = [...props.modelValue];
        const candidate = props.value ?? attrs.value;
        const index = nextValue.findIndex(item => String(item) === String(candidate));
        if (target.checked && index === -1) {
          nextValue.push(candidate);
        }
        if (!target.checked && index !== -1) {
          nextValue.splice(index, 1);
        }
        emit('update:modelValue', nextValue);
      } else {
        emit('update:modelValue', target.checked);
      }
      emit('change', event);
    };

    return {
      checkboxClasses,
      checkboxAttrs,
      checkedValue,
      onChange,
    };
  },
});
</script>
