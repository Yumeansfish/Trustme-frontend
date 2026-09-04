<template>
  <article class="aw-review-highlight-card">
    <div class="aw-review-item-header">
      <span class="aw-review-time">{{ recordedTime }}</span>
      <span class="aw-review-kind">Highlight</span>
    </div>
    <!-- Highlight recordings do not currently ship a separate caption track. -->
    <!-- eslint-disable-next-line vuejs-accessibility/media-has-caption -->
    <video
      class="aw-review-video"
      controls
      playsinline
      preload="metadata"
      :src="highlight.video_url"
    ></video>
    <div class="aw-review-highlight-actions">
      <ui-button :to="timelineLink" size="sm">
        View the timeline at this moment
      </ui-button>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import type { ReviewHighlight } from '~/shared/contracts/review.generated';
import UiButton from '~/shared/ui/Button.vue';

export default defineComponent({
  name: 'ReviewHighlightCard',
  components: { UiButton },
  props: {
    highlight: {
      type: Object as PropType<ReviewHighlight>,
      required: true,
    },
  },
  computed: {
    timelineLink(): RouteLocationRaw {
      const scope = this.$route.query.scope || this.$route.query.host;
      return {
        path: '/timeline',
        query: {
          ts: this.highlight.recorded_at,
          seconds: '60',
          ...(typeof scope === 'string' ? { scope } : {}),
          returnTo: this.$route.fullPath,
          returnLabel: 'Review',
        },
      };
    },
    recordedTime(): string {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(this.highlight.recorded_at));
    },
  },
});
</script>
