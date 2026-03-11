<template>
<div class="space-y-4">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <h3 class="aw-section-title">Developer zone</h3>
    <theme-toggle-button floating></theme-toggle-button>
  </div>
  <p>Just some tools to aid in development and debugging.</p>
  <p>Nothing to see here right now...</p>
</div>
</template>

<script lang="ts">
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';

export default {
  name: 'aw-dev',
  components: {
    ThemeToggleButton,
  },
};
</script>
