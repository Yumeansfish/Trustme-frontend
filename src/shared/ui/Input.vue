<template>
  <input
    v-bind="inputAttrs"
    :class="inputClasses"
    :value="boundValue"
    :checked="boundChecked"
    @input="onInput"
    @change="onChange"
  >
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'UiInput',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number, Boolean],
      default: undefined,
    },
    modelModifiers: {
      type: Object,
      default: () => ({}),
    },
    type: {
      type: String,
      default: 'text',
    },
    size: {
      type: String,
      default: 'md',
    },
    invalid: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { attrs, emit }) {
    const inputType = computed(() => props.type || 'text');

    const inputClasses = computed(() => {
      if (inputType.value === 'checkbox' || inputType.value === 'radio' || inputType.value === 'color') {
        return [attrs.class];
      }
      const sizeClass = props.size === 'sm' ? 'aw-input-sm' : 'aw-input';
      return [sizeClass, props.invalid ? 'aw-input-invalid' : '', attrs.class];
    });

    const inputAttrs = computed(() => {
      const baseAttrs = { ...attrs };
      delete baseAttrs.class;
      delete baseAttrs.value;
      return {
        ...baseAttrs,
        type: inputType.value,
      };
    });

    const boundValue = computed(() => {
      if (inputType.value === 'checkbox' || inputType.value === 'radio' || inputType.value === 'file') {
        return undefined;
      }
      return props.modelValue ?? attrs.value ?? undefined;
    });

    const boundChecked = computed(() => {
      if (inputType.value === 'checkbox') {
        return Boolean(props.modelValue);
      }
      if (inputType.value === 'radio') {
        return props.modelValue !== undefined && String(props.modelValue) === String(attrs.value);
      }
      return undefined;
    });

    const onInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (inputType.value === 'file') {
        return;
      }
      if (inputType.value === 'checkbox') {
        emit('update:modelValue', target.checked);
        return;
      }
      if (inputType.value === 'radio') {
        if (target.checked) {
          emit('update:modelValue', target.value);
        }
        return;
      }
      let value: string | number = target.value;
      if (inputType.value === 'number' || props.modelModifiers.number) {
        value = target.value === '' ? '' : Number(target.value);
      }
      emit('update:modelValue', value);
    };

    const onChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (inputType.value === 'file') {
        emit('change', event);
        return;
      }
      if (inputType.value === 'checkbox') {
        emit('update:modelValue', target.checked);
      }
      if (inputType.value === 'radio' && target.checked) {
        emit('update:modelValue', target.value);
      }
      emit('change', event);
    };

    return {
      boundChecked,
      boundValue,
      inputAttrs,
      inputClasses,
      onChange,
      onInput,
    };
  },
});
</script>
