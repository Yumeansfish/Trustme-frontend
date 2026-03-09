<template>
  <select
    v-bind="selectAttrs"
    :class="selectClasses"
    :value="modelValue"
    @change="onChange"
  >
    <slot />
  </select>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'UiSelect',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number, Array],
      default: '',
    },
    size: {
      type: String,
      default: 'md',
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { attrs, emit }) {
    const selectClasses = computed(() => {
      const sizeClass = props.size === 'sm' ? 'aw-select-sm' : 'aw-select';
      return [sizeClass, attrs.class];
    });

    const selectAttrs = computed(() => {
      const baseAttrs = { ...attrs };
      delete baseAttrs.class;
      return baseAttrs;
    });

    const onChange = (event: Event) => {
      const target = event.target as HTMLSelectElement;
      let value: string | string[] = target.value;
      if (target.multiple) {
        value = Array.from(target.selectedOptions).map(option => option.value);
      }
      emit('update:modelValue', value);
      emit('change', event);
    };

    return {
      onChange,
      selectAttrs,
      selectClasses,
    };
  },
});
</script>
