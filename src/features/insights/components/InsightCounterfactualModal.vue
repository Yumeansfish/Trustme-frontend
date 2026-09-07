<template>
  <app-modal
    :open="open"
    :title="result?.title ?? 'Insight'"
    panel-class="aw-counterfactual-panel"
    @update:open="$emit('update:open', $event)"
  >
    <div v-if="result" class="aw-counterfactual-content">
      <div class="aw-counterfactual-states" aria-label="Current and better semantic states">
        <div>
          <span>Current state</span>
          <strong>{{ currentState }}</strong>
        </div>
        <span class="aw-counterfactual-arrow" aria-hidden="true">→</span>
        <div class="text-right">
          <span>Better state</span>
          <strong>{{ betterState }}</strong>
        </div>
      </div>

      <p v-if="suggestionText" class="aw-counterfactual-suggestion" aria-live="polite">
        <strong v-if="counterfactual?.shifts.length">Suggestion:</strong> {{ suggestionText }}
      </p>

      <confirm-insight-button
        v-if="counterfactual?.shifts.length && confirmation?.required_targets.includes(result.id)"
        :date="date" :period-id="periodId" :target="result.id" :title="result.title"
        :progress="confirmation" :now-ms="nowMs" @confirmed="handleConfirmed"
      />
      <counterfactual-feedback-form
        v-if="counterfactual?.shifts.length && feedbackOpen"
        :date="date"
        :period-id="periodId"
        :target="result.id"
        @submitted="$emit('feedback-submitted', $event)"
      ></counterfactual-feedback-form>
      <p v-else-if="counterfactual?.shifts.length && feedbackMessage" class="aw-feedback-opens">
        {{ feedbackMessage }}
      </p>
    </div>
  </app-modal>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

import CounterfactualFeedbackForm from '~/features/insights/components/CounterfactualFeedbackForm.vue';
import ConfirmInsightButton from './ConfirmInsightButton.vue';
import { fetchCounterfactual } from '~/features/insights/lib/insightsClient';
import {
  insightBetterScoreLabel,
  insightScoreLabel,
} from '~/features/insights/lib/insightPresentation';
import type {
  ModelOutputCounterfactual,
  ModelOutputCounterfactualShift,
  ModelOutputResult,
  InsightConfirmationState,
} from '~/shared/contracts/model-output.generated';
import AppModal from '~/shared/ui/AppModal.vue';

export default defineComponent({
  name: 'InsightCounterfactualModal',
  components: { AppModal, CounterfactualFeedbackForm, ConfirmInsightButton },
  props: {
    open: { type: Boolean, default: false },
    date: { type: String, required: true },
    periodId: { type: String, required: true },
    feedbackAvailableAt: { type: String, default: '' },
    confirmation: { type: Object as PropType<InsightConfirmationState | null>, default: null },
    nowMs: { type: Number, default: () => Date.now() },
    result: {
      type: Object as PropType<ModelOutputResult | null>,
      default: null,
    },
  },
  emits: ['update:open', 'feedback-submitted', 'confirmed'],
  data() {
    return {
      counterfactual: null as ModelOutputCounterfactual | null,
      loading: false,
      failed: false,
      requestId: 0,
    };
  },
  computed: {
    feedbackOpen(): boolean {
      return Boolean(this.confirmation && this.feedbackAvailableAt
          && this.nowMs >= Date.parse(this.feedbackAvailableAt));
    },
    feedbackMessage(): string {
      if (!this.confirmation) return 'Preparing suggestions…';
      if (!this.feedbackAvailableAt) return '';
      return `Try the suggestions. Feedback opens at ${this.feedbackTime}.`;
    },
    feedbackTime(): string {
      return new Date(this.feedbackAvailableAt).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit',
      });
    },
    currentState(): string {
      return this.result ? insightScoreLabel(this.result) : '';
    },
    betterState(): string {
      return this.result ? insightBetterScoreLabel(this.result) : '';
    },
    suggestionText(): string {
      if (this.loading) return 'Checking nearby activity patterns…';
      if (this.failed) return 'No counterfactual is available for this insight.';
      const counterfactual = this.counterfactual;
      if (!counterfactual?.shifts.length) return '';
      const decreases = counterfactual.shifts.filter(shift => shift.delta_minutes < 0);
      const increases = counterfactual.shifts.filter(shift => shift.delta_minutes > 0);
      return `If you spent ${this.shiftGroups(decreases, 'less')} and ${this.shiftGroups(
        increases,
        'more'
      )}, the model would move toward ${this.betterState.toLowerCase()}.`;
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(open: boolean) {
        if (open) void this.loadCounterfactual();
      },
    },
    result() {
      if (this.open) void this.loadCounterfactual();
    },
  },
  methods: {
    handleConfirmed(progress: InsightConfirmationState) {
      this.$emit('confirmed', progress);
      this.$emit('update:open', false);
    },
    async loadCounterfactual() {
      const result = this.result;
      if (!result) return;
      const requestId = ++this.requestId;
      this.loading = true;
      this.failed = false;
      this.counterfactual = null;
      try {
        const response = await fetchCounterfactual(this.date, this.periodId, result.id);
        if (requestId === this.requestId) this.counterfactual = response;
      } catch (error) {
        console.error('Failed to generate counterfactual', error);
        if (requestId === this.requestId) this.failed = true;
      } finally {
        if (requestId === this.requestId) this.loading = false;
      }
    },
    shiftGroups(
      shifts: ModelOutputCounterfactualShift[],
      direction: 'less' | 'more'
    ): string {
      return shifts
        .map(
          shift =>
            `${this.formatMinutes(Math.abs(shift.delta_minutes))} ${direction} on ${shift.title}`
        )
        .join(' and ');
    },
    formatMinutes(value: number): string {
      return `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value)} min`;
    },
  },
});
</script>

<style scoped>
.aw-counterfactual-content {
  display: grid;
  gap: 1.5rem;
}

.aw-feedback-opens {
  margin: 0;
  border-top: 1px solid rgb(var(--border));
  padding-top: 1rem;
  color: rgb(var(--foreground-muted));
  font-size: 0.85rem;
}

.aw-counterfactual-states {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
}

.aw-counterfactual-states div {
  display: grid;
  gap: 0.2rem;
}

.aw-counterfactual-states span {
  color: rgb(var(--foreground-muted));
  font-size: 0.78rem;
  font-weight: 600;
}

.aw-counterfactual-states strong {
  color: rgb(var(--foreground-emphasis));
  font-size: 1.8rem;
  line-height: 1;
}

.aw-counterfactual-arrow {
  color: rgb(var(--summary-vis-normal));
  font-size: 1.25rem !important;
}

.aw-counterfactual-suggestion {
  margin: 0;
  color: rgb(var(--foreground-strong));
  font-size: 0.92rem;
  line-height: 1.55;
}

</style>
