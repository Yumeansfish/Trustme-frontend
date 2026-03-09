<template>
  <details v-bind="detailsAttrs" :class="detailsClasses" :open="open">
    <summary :class="summaryClasses">
      <slot name="summary" />
    </summary>
    <div :class="contentClass">
      <slot />
    </div>
  </details>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'UiCollapsible',
  inheritAttrs: false,
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    summaryClass: {
      type: String,
      default: '',
    },
    contentClass: {
      type: String,
      default: '',
    },
  },
  setup(props, { attrs }) {
    const detailsClasses = computed(() => attrs.class);

    const detailsAttrs = computed(() => {
      const baseAttrs = { ...attrs };
      delete baseAttrs.class;
      return baseAttrs;
    });

    const summaryClasses = computed(() => props.summaryClass);

    return {
      detailsAttrs,
      detailsClasses,
      summaryClasses,
    };
  },
});
</script>
