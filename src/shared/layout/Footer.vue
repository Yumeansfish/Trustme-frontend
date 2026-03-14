<template>
<div class="mx-auto max-w-7xl space-y-4 px-4 py-6 text-sm text-foreground">
  <div class="space-y-2">
    <div class="font-medium">trust-me</div>
    <div class="text-xs text-foreground-muted" v-if="info"><span class="mr-3"><b>Host:</b>&nbsp; {{info.hostname}}</span><span><b>Version:</b>&nbsp; {{info.version}}</span></div>
  </div>
  <div class="flex flex-col gap-3 text-sm text-foreground-muted md:flex-row md:items-center md:justify-between">
    <div class="flex flex-wrap items-center gap-4"><ui-link class="aw-link-muted inline-flex items-center gap-1" href="https://github.com/Yumeansfish/Trustme-backend/issues" target="_blank">
        <icon name="bug"></icon>Report an issue</ui-link><ui-link class="aw-link-muted inline-flex items-center gap-1" href="https://yumeansfish.github.io/Trustme-backend/" target="_blank">
        <icon name="download"></icon>Download</ui-link></div>
    <div class="flex flex-wrap items-center gap-4"><ui-link class="aw-link-muted inline-flex items-center gap-1" href="https://github.com/Yumeansfish/Trustme-backend" target="_blank">
        <icon name="brands/github"></icon>GitHub</ui-link></div>
  </div>
</div>
</template>

<script lang="ts">
// only import the icons you use to reduce bundle size

import { mapState } from 'pinia';
import { useServerStore } from '~/shared/stores/server';

export default {
  name: 'Footer',
  computed: {
    ...mapState(useServerStore, ['info']),
  },
};
</script>
