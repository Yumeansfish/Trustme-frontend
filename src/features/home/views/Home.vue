<template>
  <div class="aw-home-page">
    <header class="flex shrink-0 flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="aw-page-title aw-title-system">Home</h1>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="showDeveloperControls">
          <questionnaire-notification-test-button></questionnaire-notification-test-button>
          <ui-button
            class="aw-btn aw-btn-sm aw-btn-secondary"
            type="button"
            :aria-pressed="previewEmptyInsights"
            @click="previewEmptyInsights = !previewEmptyInsights"
          >
            {{ previewEmptyInsights ? 'Show live Insights' : 'Preview empty Insights' }}
          </ui-button>
        </template>
        <div class="aw-home-check-in-calendar">
          <date-navigator
            v-model="calendarDate"
            icon-only
            :max="today"
            :marked-dates="markedCalendarDates"
            :disable-next="calendarDate === today"
            placeholder="Home calendar"
            latest-label="Today"
            @previous="moveCalendarDate(-1)"
            @next="moveCalendarDate(1)"
          ></date-navigator>
        </div>
        <theme-toggle-button floating></theme-toggle-button>
      </div>
    </header>

    <section class="aw-home-actions" aria-label="Home controls">
      <router-link
        class="aw-settings-card aw-home-action-card aw-interactive-card group"
        to="/activity"
        aria-label="View Activity"
      >
        <div class="aw-home-action-row">
          <div class="flex min-w-0 items-center gap-4">
            <span class="aw-settings-card-icon">
              <icon class="h-5 w-5" name="calendar-day"></icon>
            </span>
            <h2 class="aw-title-system text-xl font-semibold text-foreground-strong">
              View Activity
            </h2>
          </div>
          <icon
            class="h-4 w-4 text-foreground-subtle transition-transform group-hover:translate-x-0.5"
            name="chevron-right"
          ></icon>
        </div>
      </router-link>

      <overall-wellbeing-card :result="overallWellbeing"></overall-wellbeing-card>

      <privacy-control-card></privacy-control-card>

      <daily-check-in-card
        :checked-in="Boolean(currentCheckIn)"
        :session="checkInSession"
        :disabled="checkInLoading || checkInSaving || checkInClosed"
        :busy="checkInSaving" :closed="checkInClosed" :message="checkInMessage" :error="checkInError"
        @check-in="handleDailyCheckIn"
      ></daily-check-in-card>

      <questionnaire-todo-card
        :pending-count="previewEmptyInsights ? 0 : pendingFeedbackCount"
        :loading="previewEmptyInsights ? false : pendingFeedbackLoading"
        :error="previewEmptyInsights ? false : pendingFeedbackError"
        @activate="focusFirstPendingFeedback"
      ></questionnaire-todo-card>
    </section>

    <section class="aw-home-insights" aria-labelledby="home-insights-title">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-insights-title" class="aw-section-title aw-title-system">Insights</h2>
        <div class="aw-segmented-control" role="group" aria-label="Insights view">
          <button
            type="button"
            class="aw-segmented-item"
            :class="{ 'aw-segmented-item-active': importantInsightsOnly }"
            :aria-pressed="importantInsightsOnly"
            @click="importantInsightsOnly = true"
          >
            Important
          </button>
          <button
            type="button"
            class="aw-segmented-item"
            :class="{ 'aw-segmented-item-active': !importantInsightsOnly }"
            :aria-pressed="!importantInsightsOnly"
            @click="importantInsightsOnly = false"
          >
            All
          </button>
        </div>
      </div>
      <insights-content
        ref="insightsContent"
        :date="calendarDate"
        :force-empty="previewEmptyInsights"
        :important-only="importantInsightsOnly"
        @loaded="handleInsightsLoaded"
        @pending-feedback-change="handlePendingFeedbackChange"
      ></insights-content>
    </section>
  </div>
</template>

<script lang="ts">
import moment from 'moment';
import { defineAsyncComponent, defineComponent } from 'vue';

import { isDevelopmentServer } from '~/app/config/runtime';
import DailyCheckInCard from '~/features/daily-check-in/components/DailyCheckInCard.vue';
import {
  createDailyCheckIn,
  fetchDailyCheckIns,
} from '~/features/daily-check-in/lib/dailyCheckInClient';
import { mergeHomeCalendarDates } from '~/features/home/lib/homeCalendar';
import InsightsContent from '~/features/insights/components/InsightsContent.vue';
import type { PendingFeedbackState } from '~/features/insights/components/InsightsContent.vue';
import OverallWellbeingCard from '~/features/insights/components/OverallWellbeingCard.vue';
import type { InsightsContentData } from '~/features/insights/lib/insightsContentLoader';
import PrivacyControlCard from '~/features/privacy/components/PrivacyControlCard.vue';
import QuestionnaireTodoCard from '~/features/questionnaires/components/QuestionnaireTodoCard.vue';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import type { ModelOutputResult } from '~/shared/contracts/model-output.generated';
import type { DailyCheckInDTO } from '~/shared/contracts/daily-checkins.generated';
import { CALENDAR_DATE_FORMAT } from '~/shared/navigation/calendarDate';
import DateNavigator from '~/shared/navigation/DateNavigator.vue';

export default defineComponent({
  name: 'HomeView',
  components: {
    DailyCheckInCard,
    DateNavigator,
    InsightsContent,
    OverallWellbeingCard,
    PrivacyControlCard,
    QuestionnaireNotificationTestButton: isDevelopmentServer
      ? defineAsyncComponent(() => import('~/features/questionnaires/components/QuestionnaireNotificationTestButton.vue'))
      : { render: () => null },
    QuestionnaireTodoCard,
    ThemeToggleButton,
  },
  data() {
    const today = moment().format(CALENDAR_DATE_FORMAT);
    const linkedDate = moment(String(this.$route.query.date ?? ''), CALENDAR_DATE_FORMAT, true);
    return {
      calendarDate: linkedDate.isValid() ? linkedDate.format(CALENDAR_DATE_FORMAT) : today,
      importantInsightsOnly: true,
      checkInDates: [] as string[],
      checkIns: [] as DailyCheckInDTO[],
      checkInSession: 'morning' as 'morning' | 'afternoon',
      checkInSessionEndsAt: '',
      checkInLoading: true,
      checkInSaving: false,
      checkInError: '',
      nowMs: Date.now(),
      checkInRequestId: 0,
      insightDates: [] as string[],
      overallWellbeing: null as ModelOutputResult | null,
      pendingFeedbackCount: 0,
      pendingFeedbackError: false,
      pendingFeedbackLoading: true,
      previewEmptyInsights: false,
      dayRolloverTimer: null as number | null,
      today,
    };
  },
  computed: {
    markedCalendarDates(): string[] {
      return mergeHomeCalendarDates(this.checkInDates, this.insightDates);
    },
    currentCheckIn(): DailyCheckInDTO | undefined {
      return this.checkIns.find(record => record.checkin_date === this.today && record.session === this.checkInSession);
    },
    checkInClosed(): boolean {
      return Boolean(this.checkInSessionEndsAt && this.nowMs >= Date.parse(this.checkInSessionEndsAt));
    },
    checkInMessage(): string {
      const record = this.currentCheckIn;
      if (!record) return '';
      if (!record.inference_due_at) return this.checkInSession === 'morning'
        ? 'Checked in. Start a new round after lunch.' : 'Checked in. There is not enough time for another round today.';
      return '';
    },
    showDeveloperControls(): boolean {
      return isDevelopmentServer;
    },
  },
  mounted() {
    window.addEventListener('focus', this.handlePageResume);
    document.addEventListener('visibilitychange', this.handlePageResume);
    this.refreshDay();
  },
  beforeUnmount() {
    this.checkInRequestId += 1;
    if (this.dayRolloverTimer !== null) window.clearTimeout(this.dayRolloverTimer);
    window.removeEventListener('focus', this.handlePageResume);
    document.removeEventListener('visibilitychange', this.handlePageResume);
  },
  watch: {
    '$route.query'() {
      if (this.$route.query.todo !== '1' && this.$route.query.insights !== '1') return;
      this.refreshDay();
      const linkedDate = moment(String(this.$route.query.date ?? ''), CALENDAR_DATE_FORMAT, true);
      if (linkedDate.isValid() && linkedDate.format(CALENDAR_DATE_FORMAT) !== this.calendarDate) {
        this.calendarDate = linkedDate.format(CALENDAR_DATE_FORMAT);
      } else {
        const insights = this.$refs.insightsContent as InstanceType<typeof InsightsContent>;
        // A browser may reuse this tab for the popup link. Load the newly ready
        // period before consuming the link and drawing attention to its card.
        void insights?.load(true);
      }
    },
    calendarDate() {
      this.overallWellbeing = null;
      this.pendingFeedbackCount = 0;
      this.pendingFeedbackError = false;
      this.pendingFeedbackLoading = this.calendarDate === this.today;
    },
  },
  methods: {
    handlePageResume() {
      if (!document.hidden) this.refreshDay();
    },
    refreshDay() {
      this.nowMs = Date.now();
      const now = moment();
      const today = now.format(CALENDAR_DATE_FORMAT);
      if (today !== this.today) {
        const followingToday = this.calendarDate === this.today;
        this.today = today;
        if (followingToday) this.calendarDate = today;
      }
      if (this.dayRolloverTimer !== null) window.clearTimeout(this.dayRolloverTimer);
      // Use the next local midnight, not a fixed 24 hours (DST days can differ).
      const nextBoundary = now.hour() < 12 ? now.clone().hour(12).startOf('hour')
        : now.hour() < 17 ? now.clone().hour(17).startOf('hour')
        : now.clone().add(1, 'day').startOf('day');
      this.dayRolloverTimer = window.setTimeout(
        this.refreshDay,
        Math.max(1, nextBoundary.diff(now))
      );
      void this.loadDailyCheckIns();
    },
    async loadDailyCheckIns() {
      const requestId = ++this.checkInRequestId;
      this.checkInLoading = true;
      try {
        const response = await fetchDailyCheckIns();
        if (requestId !== this.checkInRequestId) return;
        this.checkIns = response.checkins;
        this.checkInSession = response.current_session;
        this.checkInSessionEndsAt = response.session_ends_at;
        this.checkInError = '';
        this.checkInDates = response.checkins
          .map(checkin => checkin.checkin_date)
          .sort();
      } catch (error) {
        console.error('Failed to load Daily Check-ins', error);
        if (requestId === this.checkInRequestId) this.checkInError = 'Could not load check-ins. Please reopen Home.';
      } finally {
        if (requestId === this.checkInRequestId) this.checkInLoading = false;
      }
    },
    async handleDailyCheckIn() {
      if (this.checkInLoading || this.checkInSaving || this.checkInClosed || this.currentCheckIn) return;
      this.checkInSaving = true;
      this.checkInError = '';
      try {
        const checkin = await createDailyCheckIn();
        this.checkInRequestId += 1;
        this.checkInLoading = false;
        this.checkIns = [...this.checkIns.filter(record =>
          record.checkin_date !== checkin.checkin_date || record.session !== checkin.session), checkin];
        this.checkInSession = checkin.session;
        this.checkInSessionEndsAt = checkin.session_ends_at ?? '';
        this.checkInDates = [...new Set([
          ...this.checkInDates,
          checkin.checkin_date,
        ])].sort();
      } catch (error) {
        console.error('Failed to save Daily Check-in', error);
        this.checkInError = 'Could not save your check-in. Please try again.';
      } finally {
        this.checkInSaving = false;
      }
    },
    moveCalendarDate(days: number) {
      this.calendarDate = moment(this.calendarDate, CALENDAR_DATE_FORMAT)
        .add(days, 'days')
        .format(CALENDAR_DATE_FORMAT);
    },
    handleInsightsLoaded(content: InsightsContentData) {
      this.insightDates = content.availableDates;
      const latestReport = content.reports[content.reports.length - 1];
      this.overallWellbeing =
        latestReport?.results.find(result => result.id === 'overall_wellbeing') ?? null;
    },
    handlePendingFeedbackChange(state: PendingFeedbackState) {
      if (this.calendarDate !== this.today) {
        this.pendingFeedbackCount = 0;
        this.pendingFeedbackError = false;
        this.pendingFeedbackLoading = false;
        return;
      }
      this.pendingFeedbackCount = state.count;
      this.pendingFeedbackError = state.error;
      this.pendingFeedbackLoading = state.loading;
      if (!state.loading) this.openTodoFromNotificationLink();
    },
    focusFirstPendingFeedback() {
      const insights = this.$refs.insightsContent as InstanceType<typeof InsightsContent>;
      void insights.drawAttentionToFirstPendingFeedback();
    },
    openTodoFromNotificationLink() {
      const suggestions = this.$route.query.insights === '1';
      if (this.$route.query.todo !== '1' && !suggestions) return;
      if (this.pendingFeedbackLoading) return;
      const periodId = String(this.$route.query.period ?? '');
      const query = { ...this.$route.query };
      delete query.todo;
      delete query.insights;
      delete query.period;
      delete query.date;
      void this.$router.replace({ path: '/home', query });
      void this.$nextTick(() => {
        const insights = this.$refs.insightsContent as InstanceType<typeof InsightsContent>;
        void insights?.drawAttentionToFirstPendingFeedback(periodId, suggestions);
      });
    },
  },
});
</script>

<style scoped>
.aw-home-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: clamp(1rem, 2vh, 1.5rem);
  padding-bottom: 1rem;
}

.aw-home-actions {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
  align-items: stretch;
}

.aw-home-check-in-calendar {
  display: flex;
  align-items: center;
}

.aw-home-action-card {
  display: block;
  min-height: clamp(7.5rem, 12vh, 10rem);
  color: inherit;
  text-decoration: none;
  transition: border-color var(--duration-fast), background-color var(--duration-fast),
    box-shadow var(--duration-fast), transform var(--duration-fast);
}

.aw-home-action-card:hover {
  border-color: rgb(var(--summary-vis-normal) / 0.22);
  transform: translateY(-1px);
}

.aw-home-action-card:focus-visible {
  outline: 2px solid rgb(var(--summary-vis-normal));
  outline-offset: 3px;
}

.aw-home-action-row {
  display: flex;
  min-height: 0;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.aw-home-insights {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.75rem;
}

@media (max-width: 1279px) {
  .aw-home-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .aw-home-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
