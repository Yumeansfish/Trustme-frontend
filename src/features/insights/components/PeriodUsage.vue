<template>
<svg class="aw-chart-surface block h-20 w-full"></svg>
</template>

<script lang="ts">
// NOTE: This is just a Vue.js component wrapper for periodusage.js
//       Code should generally go in the framework-independent file.

import periodusage from '../lib/periodusage';

export default {
  name: 'aw-periodusage',
  props: {
    periodusage_arr: {
      type: Array,
    },
  },
  watch: {
    periodusage_arr: function () {
      periodusage.update(this.$el, this.periodusage_arr, this.onPeriodClicked);
    },
  },
  mounted: function () {
    periodusage.create(this.$el);
    periodusage.set_status(this.$el, 'Loading...');
  },
  methods: {
    onPeriodClicked: function (period) {
      this.$emit('update', period);
    },
  },
};
</script>
