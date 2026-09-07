<template>
  <div class="aw-insights-content min-w-0">
    <aw-alert v-if="error" show variant="warning">{{ error }}</aw-alert>
    <aw-alert v-if="importantOnly && pendingFeedbackError && !error" show variant="warning">
      Couldn't check which insights need feedback. Switch to All to see your insights.
    </aw-alert>

    <section
      v-if="loading"
      class="aw-card-muted px-6 py-8 text-sm text-foreground-muted"
    >
      Loading Insights...
    </section>

    <div
      v-else-if="visibleReports.length && !forceEmpty"
      class="aw-insights-reports"
      :class="{ 'aw-insights-reports-important': importantOnly }"
    >
      <div
        v-for="group in reportGroups"
        :key="group.id"
        class="aw-insights-report-group"
        :data-session="importantOnly ? group.id : undefined"
      >
        <insight-session-card
          v-for="report in group.reports"
          :key="report.id"
          :report="report"
          :compact="importantOnly"
          :session-label="group.label"
          :attention-target-id="attentionPeriodId === report.id ? attentionTargetId : ''"
          :pending-feedback-target-ids="pendingFeedbackTargetsForReport(report)"
          :now-ms="nowMs"
          @feedback-submitted="handleFeedbackSubmitted"
          @confirmed="handleConfirmed(report.id, $event)"
        />
      </div>
    </div>

    <section
      v-else-if="!error && !(importantOnly && pendingFeedbackError)"
      class="aw-insights-empty"
      aria-live="polite"
    >
      <img
        class="aw-insights-empty-panda"
        src="/questionnaire-panda.png"
        alt="A panda holding a pencil"
      >
      <div class="aw-insights-empty-copy">
        <h3 class="aw-title-system">{{ emptyGreeting }}</h3>
        <p>{{ emptyMessage }}</p>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import moment from 'moment';
import { defineComponent } from 'vue';

import { get_today } from '~/app/lib/time';
import InsightSessionCard from '~/features/insights/components/InsightSessionCard.vue';
import { fetchInsights } from '~/features/insights/lib/insightsClient';
import { INSIGHT_RESULT_ORDER } from '~/features/insights/lib/insightPresentation';
import { loadInsightsContent } from '~/features/insights/lib/insightsContentLoader';
import { fetchModelFeedback } from '~/features/insights/lib/modelFeedbackClient';
import type { ModelFeedbackDTO } from '~/shared/contracts/model-feedback.generated';
import type {
  ModelOutputReport,
  ModelOutputResult,
  InsightConfirmationState,
} from '~/shared/contracts/model-output.generated';

export interface PendingFeedbackState {
  count: number;
  error: boolean;
  loading: boolean;
}

interface InsightFeedbackIdentity {
  date: string;
  periodId: string;
  target: string;
}

export default defineComponent({
  name: 'InsightsContent',
  components: {
    InsightSessionCard,
  },
  props: {
    date: {
      type: String,
      default: '',
    },
    forceEmpty: {
      type: Boolean,
      default: false,
    },
    importantOnly: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['loaded', 'pending-feedback-change'],
  data() {
    return {
      attentionPeriodId: '',
      attentionTargetId: '',
      attentionTimer: null as number | null,
      loading: false,
      error: '',
      reports: [] as ModelOutputReport[],
      pendingFeedback: [] as InsightFeedbackIdentity[],
      pendingFeedbackError: false,
      pendingFeedbackLoading: true,
      latestRequestId: 0,
      nowMs: Date.now(),
      refreshTimer: null as number | null,
      refreshInFlight: false,
    };
  },
  computed: {
    visibleReports(): ModelOutputReport[] {
      if (!this.importantOnly) return this.reports;
      return this.reports.flatMap(report => {
        const pendingTargets = this.pendingFeedbackTargetsForReport(report);
        const results = report.results.filter(
          result => result.has_counterfactual && pendingTargets.includes(result.id)
        );
        return results.length ? [{ ...report, results }] : [];
      });
    },
    reportGroups(): { id: string; label: string; reports: ModelOutputReport[] }[] {
      if (!this.importantOnly) return [{ id: 'all', label: '', reports: this.visibleReports }];
      return [
        { id: 'morning', label: 'Morning' },
        { id: 'afternoon', label: 'Afternoon' },
      ].map(group => ({
        ...group,
        reports: this.visibleReports.filter(report => report.checkin_session === group.id),
      })).filter(group => group.reports.length);
    },
    localHour(): number {
      return new Date(this.nowMs).getHours();
    },
    emptyGreeting(): string {
      if (this.localHour >= 18) return 'Good evening';
      if (this.importantOnly && this.reports.length && !this.forceEmpty) {
        return 'No important insights';
      }
      return this.localHour < 12 ? 'Good morning' : 'Good afternoon';
    },
    emptyMessage(): string {
      if (this.localHour >= 18) return 'Time to relax!';
      if (this.importantOnly && this.reports.length && !this.forceEmpty) {
        return 'No insight tasks are waiting for this day. Switch to All to see every insight.';
      }
      return this.preferredDate === get_today()
        ? 'Your insights will appear here later today.'
        : 'No insights are available for this day.';
    },
    preferredDate(): string {
      const parsed = moment(this.date, 'YYYY-MM-DD', true);
      return parsed.isValid() ? parsed.format('YYYY-MM-DD') : get_today();
    },
  },
  watch: {
    preferredDate: {
      immediate: true,
      async handler() {
        await this.load();
      },
    },
  },
  mounted() {
    window.addEventListener('focus', this.refreshVisibleInsights);
    document.addEventListener('visibilitychange', this.refreshVisibleInsights);
    this.scheduleRefresh();
  },
  beforeUnmount() {
    this.latestRequestId += 1;
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    window.removeEventListener('focus', this.refreshVisibleInsights);
    document.removeEventListener('visibilitychange', this.refreshVisibleInsights);
    if (this.attentionTimer !== null) window.clearTimeout(this.attentionTimer);
  },
  methods: {
    scheduleRefresh() {
      if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
      const nextFeedback = this.reports
        .map(report => Date.parse(report.feedback_available_at ?? ''))
        .filter(timestamp => timestamp > Date.now());
      const delay = Math.min(30_000, ...nextFeedback.map(timestamp => timestamp - Date.now() + 20));
      this.refreshTimer = window.setTimeout(() => {
        this.nowMs = Date.now();
        this.emitPendingFeedbackState();
        void this.refreshVisibleInsights();
        this.scheduleRefresh();
      }, Math.max(20, delay));
    },
    async refreshVisibleInsights() {
      if (document.hidden || this.refreshInFlight || this.loading) return;
      this.nowMs = Date.now();
      this.emitPendingFeedbackState();
      if (this.preferredDate !== get_today() || this.forceEmpty) return;
      this.refreshInFlight = true;
      try {
        await this.load(true);
      } finally {
        this.refreshInFlight = false;
      }
    },
    async load(silent = false) {
      const requestId = ++this.latestRequestId;
      if (!silent) this.loading = true;
      this.nowMs = Date.now();
      this.error = '';
      if (!silent) this.setPendingFeedback([], { loading: true, error: false });
      try {
        const content = await loadInsightsContent(this.preferredDate, fetchInsights);
        if (requestId !== this.latestRequestId) return;

        this.reports = content.reports;
        this.$emit('loaded', content);
        await this.loadPendingFeedback(
          content.resolvedDate === this.preferredDate ? content.reports : [],
          requestId
        );
      } catch (error) {
        if (requestId !== this.latestRequestId) return;
        console.error('Failed to load Insights', error);
        if (!silent) this.reports = [];
        this.error = 'Failed to load Insights.';
        this.setPendingFeedback(silent ? this.pendingFeedback : [], { loading: false, error: true });
      } finally {
        if (requestId === this.latestRequestId) {
          this.loading = false;
          this.scheduleRefresh();
        }
      }
    },
    feedbackCandidates(reports: ModelOutputReport[]): InsightFeedbackIdentity[] {
      return reports.flatMap(report => {
        if (!report.confirmation) return [];
        const resultsById = new Map<string, ModelOutputResult>(
          report.results.map(result => [result.id, result])
        );
        return INSIGHT_RESULT_ORDER.flatMap(target => {
          const result = resultsById.get(target);
          return result?.has_counterfactual
            ? [{ date: report.date, periodId: report.id, target }]
            : [];
        });
      });
    },
    async loadPendingFeedback(reports: ModelOutputReport[], requestId: number) {
      const candidates = this.feedbackCandidates(reports);
      if (!candidates.length) {
        if (requestId === this.latestRequestId) {
          this.setPendingFeedback([], { loading: false, error: false });
        }
        return;
      }

      const statuses = await Promise.all(
        candidates.map(async identity => {
          // Sessions cannot have answers before their feedback hour opens.
          if (!this.feedbackIsOpen(identity)) {
            return { identity, pending: true, failed: false };
          }
          try {
            const response = await fetchModelFeedback(
              identity.date,
              identity.periodId,
              identity.target
            );
            return { identity, pending: response.feedback === null, failed: false };
          } catch (error) {
            console.error('Failed to load counterfactual feedback status', error);
            return { identity, pending: false, failed: true };
          }
        })
      );
      if (requestId !== this.latestRequestId) return;
      this.setPendingFeedback(
        statuses.filter(status => status.pending).map(status => status.identity),
        {
          loading: false,
          error: statuses.some(status => status.failed),
        }
      );
    },
    setPendingFeedback(
      pending: InsightFeedbackIdentity[],
      state: { loading: boolean; error: boolean }
    ) {
      this.pendingFeedback = pending;
      this.pendingFeedbackLoading = state.loading;
      this.pendingFeedbackError = state.error;
      this.emitPendingFeedbackState();
    },
    feedbackIsOpen(identity: InsightFeedbackIdentity): boolean {
      const report = this.reports.find(report => report.id === identity.periodId);
      return Boolean(report?.feedback_available_at && report.confirmation
        && this.nowMs >= Date.parse(report.feedback_available_at));
    },
    confirmationIsPending(identity: InsightFeedbackIdentity): boolean {
      const report = this.reports.find(report => report.id === identity.periodId);
      const progress = report?.confirmation;
      return Boolean(progress
        && progress.required_targets.includes(identity.target)
        && !progress.confirmed_targets.includes(identity.target));
    },
    isPendingTask(identity: InsightFeedbackIdentity): boolean {
      return this.confirmationIsPending(identity) || this.feedbackIsOpen(identity);
    },
    handleConfirmed(periodId: string, progress: InsightConfirmationState) {
      this.reports = this.reports.map(report => {
        if (report.id !== periodId) return report;
        // Responses from quickly confirming different cards can arrive out of order.
        if ((report.confirmation?.confirmed_targets.length ?? 0) > progress.confirmed_targets.length) return report;
        return { ...report, confirmation: progress, feedback_available_at: progress.feedback_available_at };
      });
      this.emitPendingFeedbackState();
      this.scheduleRefresh();
    },
    emitPendingFeedbackState() {
      this.$emit('pending-feedback-change', {
        count: this.pendingFeedback.filter(identity => this.isPendingTask(identity)).length,
        error: this.pendingFeedbackError,
        loading: this.pendingFeedbackLoading,
      } satisfies PendingFeedbackState);
    },
    pendingFeedbackTargetsForReport(report: ModelOutputReport): string[] {
      return this.pendingFeedback
        .filter(identity => identity.date === report.date && identity.periodId === report.id)
        .map(identity => identity.target);
    },
    handleFeedbackSubmitted(feedback: ModelFeedbackDTO) {
      this.setPendingFeedback(
        this.pendingFeedback.filter(
          identity =>
            !(
              identity.date === feedback.date &&
              identity.periodId === feedback.period_id &&
              identity.target === feedback.target
            )
        ),
        {
          loading: this.pendingFeedbackLoading,
          error: this.pendingFeedbackError,
        }
      );
    },
    async drawAttentionToFirstPendingFeedback(periodId = '', includeUpcoming = false): Promise<boolean> {
      const first = this.pendingFeedback.find(identity =>
        (!periodId || identity.periodId === periodId) &&
        (includeUpcoming || this.isPendingTask(identity))
      );
      if (!first) return false;
      if (this.attentionTimer !== null) {
        window.clearTimeout(this.attentionTimer);
        this.attentionTimer = null;
      }
      this.attentionPeriodId = '';
      this.attentionTargetId = '';
      await this.$nextTick();
      this.attentionPeriodId = first.periodId;
      this.attentionTargetId = first.target;
      await this.$nextTick();

      const card = (this.$el as HTMLElement).querySelector<HTMLElement>(
        '.aw-insights-answer-card-attention'
      );
      if (card && typeof card.scrollIntoView === 'function') {
        const reduceMotion =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        card.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
      this.attentionTimer = window.setTimeout(() => {
        this.attentionPeriodId = '';
        this.attentionTargetId = '';
        this.attentionTimer = null;
      }, 850);
      return true;
    },
  },
});
</script>

<style scoped>
.aw-insights-content {
  container-type: inline-size;
  --insight-card-gap: clamp(0.45rem, 0.7vw, 0.8rem);
  --insight-card-width: max(9.25rem, calc((100cqi - 5 * var(--insight-card-gap)) / 6));
}

.aw-insights-reports,
.aw-insights-report-group {
  display: grid;
  align-items: start;
  gap: 1.25rem;
  min-width: 0;
}

.aw-insights-reports-important {
  grid-template-columns: repeat(2, calc(3 * var(--insight-card-width) + 2 * var(--insight-card-gap)));
  column-gap: var(--insight-card-gap);
  overflow-x: auto;
  padding-block: 0.3rem 0.75rem;
  scrollbar-width: thin;
}

.aw-insights-empty {
  display: flex;
  min-height: clamp(14rem, 27vh, 19rem);
  align-items: center;
  justify-content: center;
  gap: clamp(1.5rem, 4vw, 3.5rem);
  border: 1px solid rgb(var(--border) / 0.72);
  border-radius: var(--radius-panel);
  background:
    radial-gradient(circle at 28% 55%, rgb(var(--summary-vis-normal) / 0.1), transparent 32%),
    rgb(var(--surface));
  padding: clamp(2rem, 4vw, 3.5rem);
}

.aw-insights-empty-panda {
  width: clamp(7.25rem, 11vw, 9.5rem);
  height: auto;
  flex: 0 0 auto;
  filter: drop-shadow(0 0.8rem 1.2rem rgb(25 28 42 / 0.08));
}

.aw-insights-empty-copy {
  display: grid;
  max-width: 24rem;
  gap: 0.45rem;
}

.aw-insights-empty-copy h3 {
  margin: 0;
  color: rgb(var(--foreground-strong));
  font-size: clamp(1.45rem, 2.4vw, 2rem);
  font-weight: 720;
  letter-spacing: -0.025em;
}

.aw-insights-empty-copy p {
  margin: 0;
  color: rgb(var(--foreground-muted));
  font-size: 0.95rem;
  line-height: 1.55;
}

@media (max-width: 640px) {
  .aw-insights-empty {
    flex-direction: column;
    text-align: center;
  }
}
</style>
