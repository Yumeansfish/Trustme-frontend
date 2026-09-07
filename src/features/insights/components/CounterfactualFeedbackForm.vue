<template>
  <section class="aw-counterfactual-feedback" aria-labelledby="counterfactual-feedback-title">
    <h3 id="counterfactual-feedback-title" class="aw-counterfactual-feedback-title">
      Your feedback
    </h3>

    <p v-if="loading" class="aw-counterfactual-feedback-status">Loading feedback…</p>

    <div v-else-if="feedback" class="aw-counterfactual-feedback-complete" role="status">
      <icon name="circle-check" class="h-4 w-4"></icon>
      <span>Thanks, your feedback has been saved.</span>
    </div>

    <form v-else class="aw-counterfactual-feedback-form" @submit.prevent="submit">
      <fieldset class="aw-counterfactual-feedback-question">
        <legend>Did you try to follow this suggestion?</legend>
        <div class="aw-counterfactual-feedback-options">
          <label
            :for="controlId('tried-yes')"
            :class="{ selected: triedToFollow === true }"
          >
            <input
              :id="controlId('tried-yes')"
              v-model="triedToFollow"
              class="sr-only"
              type="radio"
              :value="true"
            >
            Yes
          </label>
          <label
            :for="controlId('tried-no')"
            :class="{ selected: triedToFollow === false }"
          >
            <input
              :id="controlId('tried-no')"
              v-model="triedToFollow"
              class="sr-only"
              type="radio"
              :value="false"
            >
            No
          </label>
        </div>
      </fieldset>

      <fieldset v-if="triedToFollow === true" class="aw-counterfactual-feedback-question">
        <legend>Did following it help?</legend>
        <div class="aw-counterfactual-feedback-options">
          <label :for="controlId('helped-yes')" :class="{ selected: helped === true }">
            <input
              :id="controlId('helped-yes')"
              v-model="helped"
              class="sr-only"
              type="radio"
              :value="true"
            >
            Yes
          </label>
          <label :for="controlId('helped-no')" :class="{ selected: helped === false }">
            <input
              :id="controlId('helped-no')"
              v-model="helped"
              class="sr-only"
              type="radio"
              :value="false"
            >
            No
          </label>
        </div>
      </fieldset>

      <aw-alert v-if="error" show variant="warning">{{ error }}</aw-alert>

      <div>
        <ui-button type="submit" size="sm" variant="primary" :disabled="!canSubmit">
          {{ submitting ? 'Saving…' : 'Submit feedback' }}
        </ui-button>
      </div>
    </form>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import {
  fetchModelFeedback,
  submitModelFeedback,
} from '~/features/insights/lib/modelFeedbackClient';
import type { ModelFeedbackDTO } from '~/shared/contracts/model-feedback.generated';

export default defineComponent({
  name: 'CounterfactualFeedbackForm',
  emits: ['submitted'],
  props: {
    date: { type: String, required: true },
    periodId: { type: String, required: true },
    target: { type: String, required: true },
  },
  data() {
    return {
      feedback: null as ModelFeedbackDTO | null,
      triedToFollow: null as boolean | null,
      helped: null as boolean | null,
      loading: false,
      submitting: false,
      error: '',
      requestId: 0,
    };
  },
  computed: {
    identity(): string {
      return `${this.date}:${this.periodId}:${this.target}`;
    },
    canSubmit(): boolean {
      return (
        !this.submitting &&
        this.triedToFollow !== null &&
        (this.triedToFollow === false || this.helped !== null)
      );
    },
  },
  watch: {
    identity: {
      immediate: true,
      handler() {
        void this.load();
      },
    },
    triedToFollow(value: boolean | null) {
      if (value !== true) this.helped = null;
    },
  },
  methods: {
    controlId(suffix: string): string {
      return `feedback-${this.periodId}-${this.target}-${suffix}`;
    },
    async load() {
      const requestId = ++this.requestId;
      this.loading = true;
      this.error = '';
      this.feedback = null;
      this.triedToFollow = null;
      this.helped = null;
      try {
        const response = await fetchModelFeedback(this.date, this.periodId, this.target);
        if (requestId === this.requestId) this.feedback = response.feedback;
      } catch (error) {
        console.error('Failed to load counterfactual feedback', error);
        if (requestId === this.requestId) {
          this.error = 'Failed to load feedback.';
        }
      } finally {
        if (requestId === this.requestId) this.loading = false;
      }
    },
    async submit() {
      if (!this.canSubmit || this.triedToFollow === null) return;
      this.submitting = true;
      this.error = '';
      try {
        this.feedback = await submitModelFeedback({
          date: this.date,
          period_id: this.periodId,
          target: this.target,
          tried_to_follow: this.triedToFollow,
          helped: this.triedToFollow ? this.helped : null,
        });
        this.$emit('submitted', this.feedback);
      } catch (error) {
        console.error('Failed to save counterfactual feedback', error);
        this.error = 'Failed to save feedback.';
      } finally {
        this.submitting = false;
      }
    },
  },
});
</script>

<style scoped>
.aw-counterfactual-feedback {
  display: grid;
  gap: 1rem;
  border-top: 1px solid rgb(var(--border));
  padding-top: 1.25rem;
}

.aw-counterfactual-feedback-title {
  margin: 0;
  color: rgb(var(--foreground-strong));
  font-size: 1rem;
  font-weight: 700;
}

.aw-counterfactual-feedback-form,
.aw-counterfactual-feedback-question {
  display: grid;
  gap: 0.7rem;
}

.aw-counterfactual-feedback-form {
  gap: 1.1rem;
}

.aw-counterfactual-feedback-question {
  min-width: 0;
  margin: 0;
  border: 0;
  padding: 0;
}

.aw-counterfactual-feedback-question legend {
  color: rgb(var(--foreground-strong));
  font-size: 0.9rem;
  font-weight: 650;
}

.aw-counterfactual-feedback-options {
  display: flex;
  gap: 0.55rem;
}

.aw-counterfactual-feedback-options label {
  display: inline-flex;
  min-width: 4.5rem;
  min-height: 2.35rem;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(var(--border));
  border-radius: 0.7rem;
  background: rgb(var(--surface-muted) / 0.45);
  color: rgb(var(--foreground));
  font-size: 0.86rem;
  font-weight: 650;
  transition: border-color var(--duration-fast), background-color var(--duration-fast);
}

.aw-counterfactual-feedback-options label:hover,
.aw-counterfactual-feedback-options label.selected {
  border-color: rgb(var(--summary-vis-normal) / 0.45);
  background: rgb(var(--summary-vis-normal) / 0.1);
  color: rgb(var(--foreground-strong));
}

.aw-counterfactual-feedback-complete {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgb(var(--success));
  font-size: 0.9rem;
  font-weight: 600;
}

.aw-counterfactual-feedback-status {
  margin: 0;
  color: rgb(var(--foreground-muted));
  font-size: 0.88rem;
}
</style>
