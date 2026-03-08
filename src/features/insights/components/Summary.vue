<template>
<div>
  <div class="aw-summary-container"></div>
</div>
</template>

<script lang="ts">
// NOTE: This is just a Vue.js component wrapper for summary.ts
//       Code should generally go in the framework-independent file.

import summary from '../lib/summary';

export default {
  name: 'aw-summary',
  props: {
    fields: Array,
    namefunc: Function,
    hoverfunc: {
      type: Function,
      default: null,
    },
    colorfunc: Function,
    linkfunc: {
      type: Function,
      default: () => null,
    },
    with_limit: {
      type: Boolean,
      default: false,
    },
  },
  data: function () {
    return {};
  },
  computed: {},
  watch: {
    fields: function () {
      this.update();
    },
  },
  mounted: function () {
    const el = this.$el.children[0];
    summary.create(el);
    this.update();
  },
  methods: {
    update: function () {
      const el = this.$el.children[0];
      if (this.fields) {
        summary.updateSummedEvents(
          el,
          this.fields,
          this.namefunc,
          this.hoverfunc,
          this.colorfunc,
          this.linkfunc
        );
      } else {
        summary.set_status(el, 'Loading...');
      }
    },
  },
};
</script>
