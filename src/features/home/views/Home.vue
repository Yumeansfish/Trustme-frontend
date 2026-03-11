<template>
<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <h3 class="aw-section-title">Hello early user</h3>
    <theme-toggle-button floating></theme-toggle-button>
  </div>
  <aw-alert v-if="$isAndroid" show><b>Note:</b> ActivityWatch on Android is in a very early stage of development. There will be bugs, but we hope you bear with us as we refine things and get it on par with the desktop version of ActivityWatch (which you should try!).</aw-alert>
  <p class="aw-caption">It's still early days for ActivityWatch<span v-if="$isAndroid">(especially on Android!)</span>. We've come a long way but we need users (like you!)
    to provide feedback and help us turn ActivityWatch into a successful project.
    Early users like you mean a lot to us, and we hope you'll reach out to us with any ideas you have for improvements!
  </p>
  <p class="aw-caption">If you are a developer, we hope you can contribute by writing a watcher, visualization, or something else, and share it with us on the forum!</p>
  <div class="aw-card-muted">
    <div>Thank you for using ActivityWatch!</div><small class="text-foreground-muted block mt-1">If you have a minute to spare, please take the time to fill out our <ui-link class="aw-link" href="https://forms.gle/q2N9K5RoERBV8kqPA">user survey</ui-link> or <ui-link class="aw-link" href="https://forum.activitywatch.net/c/features">vote on features on the forum</ui-link>.</small>
  </div>
  <div class="aw-divider"></div>
  <div class="grid gap-6 lg:grid-cols-2">
    <div class="space-y-3">
      <h4>Spread the word</h4>
      <p class="aw-caption">
        Nothing is as motivating as getting ActivityWatch into the hands of users.
        By sharing it you get us to make ActivityWatch even better!
      </p>
      <ul class="text-foreground list-disc space-y-1 pl-5 text-sm">
        <li>Give us a like and a review on <ui-link class="aw-link" href="https://alternativeto.net/software/activitywatch/">AlternativeTo</ui-link></li>
        <li>Vote on us at <ui-link class="aw-link" href="https://www.producthunt.com/posts/activitywatch">ProductHunt</ui-link></li>
        <li>Follow us and spread the word on <ui-link class="aw-link" href="https://twitter.com/ActivityWatchIt">Twitter</ui-link> and <ui-link class="aw-link" href="https://www.facebook.com/ActivityWatch">Facebook</ui-link></li>
        <li>Star us on <ui-link class="aw-link" href="https://github.com/ActivityWatch/activitywatch">GitHub</ui-link></li>
      </ul>
    </div>
    <div class="space-y-3">
      <h4>Support us!</h4>
      <p class="aw-caption">
        Do you like ActivityWatch? Has it helped you? Help us help you by donating!
        You can donate to us via:
      </p>
      <ul class="text-foreground list-disc space-y-1 pl-5 text-sm">
        <li><ui-link class="aw-link" href="https://www.patreon.com/erikbjare">Patreon</ui-link></li>
        <li><ui-link class="aw-link" href="https://opencollective.com/activitywatch">Open Collective</ui-link></li>
        <li><ui-link class="aw-link" href="https://liberapay.com/ActivityWatch/">Liberapay</ui-link></li>
        <li><ui-link class="aw-link" href="https://activitywatch.net/donate/">Other methods</ui-link> (incl. cryptocurrency)</li>
      </ul>
      <p class="aw-caption">For more info, please visit the <ui-link class="aw-link" href="https://activitywatch.net/donate/">donation page on the website</ui-link>.</p>
    </div>
  </div>
  <div class="aw-divider"></div>
  <div class="grid gap-6 lg:grid-cols-2">
    <div class="space-y-3">
      <h4>Resources</h4>
      <ul class="text-foreground list-disc space-y-1 pl-5 text-sm">
        <li><ui-link class="aw-link" href="https://activitywatch.net/">Website</ui-link></li>
        <li><ui-link class="aw-link" href="https://activitywatch.readthedocs.org/">Documentation</ui-link></li>
        <li><ui-link class="aw-link" href="https://forum.activitywatch.net/">Forum</ui-link></li>
        <li><ui-link class="aw-link" href="https://discord.gg/vDskV9q">Discord</ui-link></li>
        <li><ui-link class="aw-link" href="https://github.com/ActivityWatch/activitywatch">GitHub</ui-link></li>
        <li v-if="info?.version && !info.version.includes('rust')"><ui-link class="aw-link" href="/api/">API Browser</ui-link></li>
      </ul>
    </div>
    <div class="space-y-3">
      <h4>Want to know what we're working on?</h4>
      <p class="aw-caption">Check out the <ui-link class="aw-link" href="https://forum.activitywatch.net/c/news">development updates</ui-link>!</p>
    </div>
  </div>
  <div class="aw-divider"></div>
  <p class="text-foreground-muted text-sm"><small><i>You can change which page opens when you open ActivityWatch (instead of this page) in the 
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
