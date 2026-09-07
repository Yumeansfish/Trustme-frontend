<template>
  <article class="aw-settings-card aw-overall-wellbeing-card h-full">
    <div class="aw-overall-wellbeing-row">
      <span class="aw-settings-card-icon aw-overall-wellbeing-icon" aria-hidden="true">
        {{ result ? symbol : '○' }}
      </span>
      <div class="aw-overall-wellbeing-copy">
        <h2 class="aw-title-system text-xl font-semibold text-foreground-strong">
          Overall
        </h2>
        <span v-if="result" class="aw-overall-wellbeing-label">{{ label }}</span>
        <span v-else class="aw-overall-wellbeing-empty">—</span>
      </div>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

import {
  insightScoreLabel,
  insightScoreSymbol,
} from '~/features/insights/lib/insightPresentation';
import type { ModelOutputResult } from '~/shared/contracts/model-output.generated';

export default defineComponent({
  name: 'OverallWellbeingCard',
  props: {
    result: {
      type: Object as PropType<ModelOutputResult | null>,
      default: null,
    },
  },
  computed: {
    label(): string {
      return this.result ? insightScoreLabel(this.result) : '';
    },
    symbol(): string {
      return this.result ? insightScoreSymbol(this.result) : '';
    },
  },
});
</script>

<style scoped>
.aw-overall-wellbeing-card {
  display: flex;
  min-height: 9.5rem;
  align-items: center;
  justify-content: center;
}

.aw-overall-wellbeing-row {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 1rem;
}

.aw-overall-wellbeing-icon {
  color: rgb(var(--summary-vis-normal));
  font-size: 1.55rem;
  line-height: 1;
}

.aw-overall-wellbeing-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
}

.aw-overall-wellbeing-label {
  color: rgb(var(--foreground-emphasis));
  font-size: 0.9rem;
  font-weight: 650;
  line-height: 1.25;
  white-space: nowrap;
}

.aw-overall-wellbeing-empty {
  color: rgb(var(--foreground-subtle));
}
</style>
