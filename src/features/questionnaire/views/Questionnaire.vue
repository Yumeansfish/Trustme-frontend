<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <span class="aw-page-title">{{ formattedDate }}</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <date-navigator
          :model-value="selectedDate"
          :min="firstAvailableDate"
          :max="latestAvailableDate || latestDate"
          :available-dates="availableDates"
          :disable-previous="disablePrevious"
          :disable-next="disableNext"
          icon-only
          @previous="goToDate(previousDate)"
          @next="goToDate(nextDate)"
          @select="goToDate($event)"
        ></date-navigator>
        <theme-toggle-button floating></theme-toggle-button>
      </div>
    </div>

    <aw-alert v-if="error" show variant="warning">{{ error }}</aw-alert>

    <section
      v-if="loading"
      class="rounded-3xl border border-base bg-surface px-6 py-8 text-sm text-foreground-muted shadow-card"
    >
      Loading questionnaire...
    </section>

    <section v-else-if="questionnaireTemplate && questionnaireInstances.length" class="space-y-4 pb-4">
      <questionnaire-card
        :questionnaire-instances="questionnaireInstances"
        :questionnaire-template="questionnaireTemplate"
        @submitted="handleQuestionnaireSubmitted"
      />
    </section>

    <section
      v-else
      class="rounded-3xl border border-base bg-surface px-6 py-10 text-center text-sm text-foreground-muted shadow-card"
    >
      No questionnaires found for this day.
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import moment from 'moment';

import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import DateNavigator from '~/shared/navigation/DateNavigator.vue';
import QuestionnaireCard from '~/features/questionnaire/components/QuestionnaireCard.vue';
import { get_today } from '~/app/lib/time';
import {
  fetchPendingQuestionnaireBundle,
  findNearestPendingDate,
  logicalDateForQuestionnaireInstance,
} from '~/features/questionnaire/lib/bundle';
import type { QuestionnaireInstance, QuestionnaireTemplate } from '~/features/questionnaire/lib/types';

export default defineComponent({
  name: 'QuestionnaireView',
  components: {
    DateNavigator,
    QuestionnaireCard,
    ThemeToggleButton,
  },
  props: {
    date: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      loading: false,
      error: '',
      availableDates: [] as string[],
      questionnaireInstances: [] as QuestionnaireInstance[],
      questionnaireTemplate: null as QuestionnaireTemplate | null,
      earliestAvailableDate: '',
      latestAvailableDate: '',
    };
  },
  computed: {
    latestDate(): string {
      return get_today();
    },
    selectedDate(): string {
      const parsed = moment(this.date, 'YYYY-MM-DD', true);
      if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
      return this.latestAvailableDate || this.latestDate;
    },
    formattedDate(): string {
      return moment(this.selectedDate, 'YYYY-MM-DD', true).locale('en').format('dddd, MMMM D, YYYY');
    },
    firstAvailableDate(): string {
      return this.availableDates.length > 0 ? this.availableDates[0] : '';
    },
    previousDate(): string {
      return moment(this.selectedDate, 'YYYY-MM-DD', true).subtract(1, 'day').format('YYYY-MM-DD');
    },
    nextDate(): string {
      return moment(this.selectedDate, 'YYYY-MM-DD', true).add(1, 'day').format('YYYY-MM-DD');
    },
    disablePrevious(): boolean {
      if (this.availableDates.length > 0) {
        return !this.availableDates.includes(this.previousDate);
      }
      if (!this.firstAvailableDate) return false;
      return moment(this.previousDate, 'YYYY-MM-DD', true).isBefore(
        moment(this.firstAvailableDate, 'YYYY-MM-DD', true),
        'day'
      );
    },
    disableNext(): boolean {
      if (this.availableDates.length > 0) {
        return !this.availableDates.includes(this.nextDate);
      }
      return moment(this.nextDate, 'YYYY-MM-DD', true).isAfter(
        moment(this.latestAvailableDate || this.latestDate, 'YYYY-MM-DD', true),
        'day'
      );
    },
  },
  watch: {
    date: {
      immediate: true,
      async handler() {
        await this.loadQuestionnaires();
      },
    },
  },
  methods: {
    buildActivityFallbackRoute() {
      return '/activity';
    },
    buildRoute(date: string) {
      return `/questionnaire/${date}`;
    },
    goToDate(date: string) {
      if (date === this.selectedDate) return;
      this.$router.push(this.buildRoute(date)).catch(() => undefined);
    },
    async handleQuestionnaireSubmitted() {
      await this.loadQuestionnaires();
    },
    async loadQuestionnaires() {
      this.loading = true;
      this.error = '';
      try {
        const selectedDate = moment(this.date, 'YYYY-MM-DD', true).isValid() ? this.date : '';
        const payload = await fetchPendingQuestionnaireBundle();
        this.availableDates = payload.pendingDates;
        this.earliestAvailableDate = payload.earliestPendingDate;
        this.latestAvailableDate = payload.latestPendingDate;
        this.questionnaireTemplate = payload.questionnaireTemplate as QuestionnaireTemplate | null;

        if (!payload.pendingDates.length) {
          this.questionnaireInstances = [];
          await this.$router.replace(this.buildActivityFallbackRoute()).catch(() => undefined);
          return;
        }

        if (!selectedDate) {
          const fallbackDate = payload.latestPendingDate || this.latestDate;
          if (fallbackDate) {
            await this.$router.replace(this.buildRoute(fallbackDate)).catch(() => undefined);
            return;
          }
        }

        if (selectedDate && !payload.pendingDates.includes(selectedDate)) {
          const nearestDate = findNearestPendingDate(selectedDate, payload.pendingDates);
          if (nearestDate) {
            await this.$router.replace(this.buildRoute(nearestDate)).catch(() => undefined);
            return;
          }
          await this.$router.replace(this.buildActivityFallbackRoute()).catch(() => undefined);
          return;
        }

        const resolvedDate = selectedDate || payload.latestPendingDate || '';
        this.questionnaireInstances = payload.pendingQuestionnaireInstances.filter(
          instance => logicalDateForQuestionnaireInstance(instance) === resolvedDate
        );
      } catch (error) {
        console.error('Failed to load questionnaires', error);
        this.availableDates = [];
        this.questionnaireTemplate = null;
        this.questionnaireInstances = [];
        this.error = 'Failed to load questionnaires.';
      } finally {
        this.loading = false;
      }
    },
  },
});
</script>
