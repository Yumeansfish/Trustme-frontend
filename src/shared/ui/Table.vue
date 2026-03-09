<template>
  <div class="overflow-x-auto">
    <table v-bind="tableAttrs" :class="tableClasses">
      <slot />
    </table>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'UiTable',
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const tableClasses = computed(() => ['aw-table', attrs.class]);
    const tableAttrs = computed(() => {
      const baseAttrs = { ...attrs };
      delete baseAttrs.class;
      return baseAttrs;
    });

    return {
      tableAttrs,
      tableClasses,
    };
  },
});
</script>
