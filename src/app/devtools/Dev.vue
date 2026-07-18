<template>
<div class="space-y-4">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <h3 class="aw-section-title">Developer zone</h3>
    <theme-toggle-button floating></theme-toggle-button>
  </div>
  <p>Developer-only controls that are intentionally kept out of the public settings surface.</p>
  <div class="aw-card-muted space-y-4">
    <p class="text-sm text-foreground-muted">
      This Activity classification override is supported for local setup and debugging,
      but it is not part of the end-user `/settings` experience.
    </p>
  </div>
  <div class="grid gap-4">
    <active-pattern-settings></active-pattern-settings>
  </div>
</div>
</template>

<script lang="ts">
import ActivePatternSettings from '~/app/devtools/ActivePatternSettings.vue';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';

export default {
  name: 'aw-dev',
  components: {
    ActivePatternSettings,
    ThemeToggleButton,
  },
};
</script>
