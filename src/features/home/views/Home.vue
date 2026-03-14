<template>
<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <h3 class="aw-section-title">trust-me</h3>
    <theme-toggle-button floating></theme-toggle-button>
  </div>
  <aw-alert v-if="$isAndroid" show><b>Note:</b> trust-me on Android is still experimental.</aw-alert>
  <p class="aw-caption">trust-me packages the dashboard, local backend, and desktop watchers into one local-first app.</p>
  <div class="aw-card-muted">
    <div>Thanks for testing trust-me.</div><small class="text-foreground-muted block mt-1">Use the links below to download the latest build, open the repository, or inspect the local API.</small>
  </div>
  <div class="aw-divider"></div>
  <div class="grid gap-6 lg:grid-cols-2">
    <div class="space-y-3">
      <h4>Resources</h4>
      <ul class="text-foreground list-disc space-y-1 pl-5 text-sm">
        <li><ui-link class="aw-link" href="https://yumeansfish.github.io/Trustme-backend/">Download page</ui-link></li>
        <li><ui-link class="aw-link" href="https://github.com/Yumeansfish/Trustme-backend">Backend repository</ui-link></li>
        <li><ui-link class="aw-link" href="https://github.com/Yumeansfish/Trustme-frontend">Frontend repository</ui-link></li>
        <li v-if="info?.version && !info.version.includes('rust')"><ui-link class="aw-link" href="/api/">API Browser</ui-link></li>
      </ul>
    </div>
    <div class="space-y-3">
      <h4>Notes</h4>
      <p class="aw-caption">This build is intended for local testing and research demos.</p>
    </div>
  </div>
  <div class="aw-divider"></div>
  <p class="text-foreground-muted text-sm"><small><i>You can change which page opens when you open trust-me (instead of this page) in the 
        <ui-link class="aw-link" to="/settings">settings</ui-link>.</i></small></p>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import { useServerStore } from '~/shared/stores/server';

export default defineComponent({
  name: 'Home',
  components: {
    ThemeToggleButton,
  },
  computed: {
    ...mapState(useServerStore, ['info']),
  },
});
</script>
