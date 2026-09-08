<template>
  <section
    class="aw-insights-period"
    :class="{ 'aw-insights-period-compact': compact }"
    :aria-labelledby="`insights-${report.id}`"
  >
    <h3 :id="`insights-${report.id}`" class="aw-insights-period-title aw-title-system">
      {{ sessionLabel || (report.checkin_session === 'morning' ? 'Morning insights' : 'Afternoon insights') }} · {{ periodLabel }}
    </h3>
    <div
      class="aw-insights-card-strip"
      :style="{ '--insight-columns': orderedResults.length }"
      role="list"
      aria-label="Model predictions"
    >
      <div
        v-for="result in orderedResults"
        :key="result.id"
        class="aw-insights-card-item"
        role="listitem"
      >
      <button
        class="aw-insights-answer-card"
        :class="{
          'aw-insights-answer-card-attention': attentionTargetId === result.id,
        }"
        :data-feedback-target="result.has_counterfactual ? result.id : undefined"
        type="button"
        :aria-label="`Explore a target for ${result.title}`"
        @click="openCounterfactual(result)"
      >
        <span
          v-if="result.has_counterfactual && completedFeedbackTargetIds.includes(result.id)"
          class="aw-completed-marker"
          title="Feedback completed"
          aria-label="Feedback completed"
        >
          <icon name="check" class="h-4 w-4"></icon>
        </span>
        <span
          v-else-if="result.has_counterfactual && pendingFeedbackTargetIds.includes(result.id) && feedbackOpen"
          class="aw-counterfactual-marker"
          title="Feedback questionnaire"
          aria-label="Feedback questionnaire"
        >
          <icon name="question-circle" class="h-4 w-4"></icon>
        </span>
        <span
          v-else-if="result.has_counterfactual"
          class="aw-suggestion-marker"
          title="Suggestion"
          aria-label="Suggestion"
        >
          <icon name="exclamation-circle" class="h-4 w-4"></icon>
        </span>
        <score-card
          :symbol="symbol(result)"
          :title="result.title"
          :subtitle="scoreLabel(result)"
          :progress="progress(result)"
        />
      </button>
      </div>
    </div>
  </section>

  <insight-counterfactual-modal
    v-model:open="counterfactualOpen"
    :date="report.date"
    :period-id="report.id"
    :result="selectedResult"
    :feedback-available-at="report.feedback_available_at ?? ''"
    :confirmation="report.confirmation ?? null"
    :now-ms="nowMs"
    @feedback-submitted="$emit('feedback-submitted', $event)"
    @confirmed="$emit('confirmed', $event)"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

import ScoreCard from '~/shared/ui/ScoreCard.vue';
import InsightCounterfactualModal from '~/features/insights/components/InsightCounterfactualModal.vue';
import type {
  ModelOutputReport,
  ModelOutputResult,
} from '~/shared/contracts/model-output.generated';
import {
  INSIGHT_RESULT_ORDER,
  insightProgress,
  insightScoreSymbol,
  insightScoreLabel,
} from '~/features/insights/lib/insightPresentation';

export default defineComponent({
  name: 'InsightSessionCard',
  components: { InsightCounterfactualModal, ScoreCard },
  props: {
    report: {
      type: Object as PropType<ModelOutputReport>,
      required: true,
    },
    compact: { type: Boolean, default: false },
    sessionLabel: { type: String, default: '' },
    attentionTargetId: {
      type: String,
      default: '',
    },
    pendingFeedbackTargetIds: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    completedFeedbackTargetIds: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    nowMs: { type: Number, default: () => Date.now() },
  },
  emits: ['feedback-submitted', 'confirmed'],
  computed: {
    feedbackOpen(): boolean {
      return Boolean(this.report.feedback_available_at && this.nowMs >= Date.parse(this.report.feedback_available_at)
        && this.report.confirmation);
    },
    periodLabel(): string {
      return `${this.report.period_start.slice(11, 16)}–${this.report.period_end.slice(11, 16)}`;
    },
    orderedResults(): ModelOutputResult[] {
      const resultsById = new Map(this.report.results.map(result => [result.id, result]));
      return INSIGHT_RESULT_ORDER.flatMap(id => {
        const result = resultsById.get(id);
        return result ? [result] : [];
      });
    },
  },
  data() {
    return {
      counterfactualOpen: false,
      selectedResult: null as ModelOutputResult | null,
    };
  },
  methods: {
    openCounterfactual(result: ModelOutputResult) {
      this.selectedResult = result;
      this.counterfactualOpen = true;
    },
    symbol(result: ModelOutputResult): string {
      return insightScoreSymbol(result);
    },
    progress(result: ModelOutputResult): number {
      return insightProgress(result);
    },
    scoreLabel(result: ModelOutputResult): string {
      return insightScoreLabel(result);
    },
  },
});
</script>

<style scoped>
.aw-insights-period {
  display: grid;
  gap: 0.75rem;
}

.aw-insights-period-title {
  margin: 0;
  color: rgb(var(--foreground-strong));
  font-size: 0.95rem;
  font-weight: 650;
}

.aw-insights-card-strip {
  display: grid;
  grid-template-columns: repeat(var(--insight-columns), var(--insight-card-width, 9.25rem));
  align-items: stretch;
  gap: var(--insight-card-gap, 0.5rem);
  width: 100%;
  overflow-x: auto;
  padding-block: 0.3rem 0.75rem;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
}

.aw-insights-answer-card {
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  border: 0;
  border-radius: var(--radius-panel);
  background: transparent;
  padding: 0;
  color: inherit;
  cursor: pointer;
  text-align: inherit;
  flex: 1;
}

.aw-insights-card-item { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; scroll-snap-align: start; }

.aw-counterfactual-marker,
.aw-completed-marker,
.aw-suggestion-marker {
  position: absolute;
  z-index: 2;
  top: 0.65rem;
  right: 0.65rem;
  display: inline-flex;
  color: rgb(var(--summary-vis-normal));
  pointer-events: none;
}

.aw-insights-answer-card :deep(.aw-score-card) {
  height: 100%;
  transition:
    border-color var(--duration-fast),
    box-shadow var(--duration-fast),
    transform var(--duration-fast);
}

.aw-insights-answer-card :deep(.aw-score-card-subtitle) {
  min-height: 2rem;
}

.aw-insights-answer-card:hover :deep(.aw-score-card) {
  border-color: rgb(var(--summary-vis-normal));
  box-shadow: var(--shadow-soft);
  transform: translateY(-2px);
}

.aw-insights-answer-card-attention :deep(.aw-score-card) {
  border-color: rgb(var(--summary-vis-normal) / 0.52);
  box-shadow: 0 0 0 4px rgb(var(--summary-vis-normal) / 0.09), var(--shadow-soft);
}

@media (prefers-reduced-motion: no-preference) {
  .aw-insights-answer-card-attention {
    animation: aw-insight-questionnaire-nudge 440ms cubic-bezier(0.22, 1, 0.36, 1);
    animation-delay: 140ms;
  }
}

@keyframes aw-insight-questionnaire-nudge {
  0%,
  100% {
    transform: translateX(0);
  }
  28% {
    transform: translateX(6px);
  }
  52% {
    transform: translateX(-4px);
  }
  76% {
    transform: translateX(2px);
  }
}

.aw-insights-answer-card:focus-visible {
  outline: 3px solid rgb(var(--focus-ring));
  outline-offset: 3px;
}

.aw-insights-period-compact .aw-insights-card-strip {
  grid-template-columns: repeat(3, var(--insight-card-width, 9.25rem));
  overflow: visible;
  padding-block: 0;
}
</style>
