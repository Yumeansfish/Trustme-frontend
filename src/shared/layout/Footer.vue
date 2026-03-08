<template>
<div class="mx-auto max-w-7xl space-y-4 px-4 py-6 text-sm text-foreground">
  <div class="space-y-2">Made with<a class="aw-link-danger" href="https://activitywatch.net/donate/" target="_blank">
      <icon name="heart" scale="0.75"></icon></a>by the <a href="http://activitywatch.net/contributors/">ActivityWatch developers</a>
    <div class="text-xs text-foreground-muted" v-if="info"><span class="mr-3"><b>Host:</b>&nbsp; {{info.hostname}}</span><span><b>Version:</b>&nbsp; {{info.version}}</span></div>
  </div>
  <div class="flex flex-col gap-3 text-sm text-foreground-muted md:flex-row md:items-center md:justify-between">
    <div class="flex flex-wrap items-center gap-4"><a class="aw-link-muted inline-flex items-center gap-1" href="https://github.com/ActivityWatch/activitywatch/issues/new/choose" target="_blank">
        <icon name="bug"></icon>Report a bug</a><a class="aw-link-muted inline-flex items-center gap-1" href="https://forum.activitywatch.net/c/support" target="_blank">
        <icon name="question-circle"></icon>Ask for help</a><a class="aw-link-muted inline-flex items-center gap-1" href="https://forum.activitywatch.net/c/features" target="_blank">
        <icon name="vote-yea"></icon>Vote on features</a></div>
    <div class="flex flex-wrap items-center gap-4"><a class="aw-link-muted inline-flex items-center gap-1" href="https://twitter.com/ActivityWatchIt" target="_blank">
        <icon name="brands/twitter"></icon>Twitter</a><a class="aw-link-muted inline-flex items-center gap-1" href="https://github.com/ActivityWatch" target="_blank">
        <icon name="brands/github"></icon>GitHub</a><a class="aw-link-muted inline-flex items-center gap-1" href="https://activitywatch.net/donate/" target="_blank">
        <icon name="hand-holding-heart"></icon>Donate</a></div>
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
