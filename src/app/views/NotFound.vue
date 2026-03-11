<template>
<div class="space-y-4">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <h3 class="aw-section-title">Woops, this page was not found!</h3>
    <theme-toggle-button floating></theme-toggle-button>
  </div>
  <p class="mb-0">Try navigating back where you came from.</p>
</div>
</template>

<script lang="ts">
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';

export default {
  name: 'NotFound',
  components: {
    ThemeToggleButton,
  },
};
</script>
