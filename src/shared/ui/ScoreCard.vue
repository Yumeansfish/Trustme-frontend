<template>
  <article class="aw-score-card" :class="{ 'aw-score-card-muted': muted }">
    <div class="aw-score-card-top">
      <div class="aw-score-card-visual">
        <div class="aw-score-card-symbol" aria-hidden="true">{{ symbol }}</div>
        <div
          v-if="normalizedProgress !== null"
          class="aw-score-progress-track"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="normalizedProgress"
          :aria-label="`${title} score`"
        >
          <div
            class="aw-score-progress-bar"
            :data-progress="normalizedProgress"
            :style="{ width: `${normalizedProgress}%` }"
          ></div>
        </div>
      </div>
      <div class="aw-score-card-copy">
        <div class="aw-score-card-title">{{ title }}</div>
        <div class="aw-score-card-subtitle">{{ subtitle }}</div>
      </div>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ScoreCard',
  props: {
    symbol: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      default: '',
    },
    progress: {
      type: Number,
      default: null,
    },
    muted: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    normalizedProgress(): number | null {
      if (!Number.isFinite(this.progress)) return null;
      return Math.min(100, Math.max(0, this.progress));
    },
  },
});
</script>

<style scoped>
.aw-score-card {
  display: flex;
  width: 100%;
  min-height: 7.75rem;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgb(var(--border));
  border-radius: var(--radius-panel);
  background-color: rgb(var(--surface));
  padding: 0.9rem 0.85rem;
}

.aw-score-card-muted {
  border-color: rgb(var(--border));
  background-color: rgb(var(--surface-muted));
}

.aw-score-card-top {
  display: flex;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
}

.aw-score-card-visual {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
}

.aw-score-card-symbol {
  display: flex;
  min-height: 2.6rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: rgb(var(--summary-vis-normal));
  font-size: 2.15rem;
  font-weight: 700;
  line-height: 1;
}

.aw-score-progress-track {
  height: 0.3rem;
  width: 100%;
  overflow: hidden;
  border-radius: 9999px;
  background-color: rgb(var(--border-muted));
}

.aw-score-progress-bar {
  height: 100%;
  border-radius: 9999px;
  background-color: rgb(var(--summary-vis-normal));
  transition: width var(--duration-fast);
}

.aw-score-card-copy {
  min-width: 0;
  width: 100%;
  text-align: center;
}

.aw-score-card-title {
  overflow: hidden;
  color: rgb(var(--foreground-emphasis));
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aw-score-card-subtitle {
  margin-top: 0.25rem;
  color: rgb(var(--foreground-muted));
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1rem;
}
</style>
