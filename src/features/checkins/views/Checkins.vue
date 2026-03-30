<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <span class="aw-page-title">{{ formattedDate }}</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="aw-segmented-control">
          <button
            type="button"
            class="aw-segmented-item"
            :class="selectedView === 'list' ? 'aw-segmented-item-active' : ''"
            @click="goToView('list')"
          >
            List
          </button>
          <button
            type="button"
            class="aw-segmented-item"
            :class="selectedView === 'diagram' ? 'aw-segmented-item-active' : ''"
            @click="goToView('diagram')"
          >
            Diagram
          </button>
        </div>
        <date-navigator
          :model-value="selectedDate"
          :min="firstAvailableDate"
          :max="latestAvailableDate"
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
      Loading Check-ins...
    </section>

    <check-in-diagram
      v-else-if="selectedView === 'diagram' && orderedSessions.length"
      :sessions="orderedSessions"
    />

    <section v-else-if="orderedSessions.length" class="space-y-4 pb-4">
      <check-in-session-card
        v-for="session in orderedSessions"
        :key="session.id"
        :session="session"
      />
    </section>

    <section
      v-else
      class="rounded-3xl border border-base bg-surface px-6 py-10 text-center text-sm text-foreground-muted shadow-card"
    >
      No check-ins found for this day.
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import moment from 'moment';

import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import DateNavigator from '~/shared/navigation/DateNavigator.vue';
import { get_today } from '~/app/lib/time';
import CheckInSessionCard from '~/features/checkins/components/CheckInSessionCard.vue';
import CheckInDiagram from '~/features/checkins/components/CheckInDiagram.vue';
import { useSettingsStore } from '~/features/settings/store/settings';
import type { CheckinSession } from '~/shared/contracts/checkins.generated';
import { fetchCheckins } from '~/features/checkins/lib/checkinsClient';
import { resolveLatestAvailableDate } from '~/shared/navigation/dateAvailability';
import {
  acceptCheckinsResponse,
  beginCheckinsRequest,
  canNavigateToCheckinDate,
  createCheckinsRequestState,
  finishCheckinsRequest,
  isCurrentCheckinsRequest,
  resolveCheckinsRedirectDate,
} from '~/features/checkins/lib/checkinsViewState';

export default defineComponent({
  name: 'CheckinsView',
  components: {
    CheckInSessionCard,
    CheckInDiagram,
    DateNavigator,
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
      settingsStore: useSettingsStore(),
      loading: false,
      error: '',
      availableDates: null as string[] | null,
      sessions: [] as CheckinSession[],
      requestState: createCheckinsRequestState(),
    };
  },
  computed: {
    latestDate(): string {
      return get_today();
    },
    selectedDate(): string {
      const parsed = moment(this.date, 'YYYY-MM-DD', true);
      return parsed.isValid() ? parsed.format('YYYY-MM-DD') : this.latestDate;
    },
    formattedDate(): string {
      return moment(this.selectedDate, 'YYYY-MM-DD', true).locale('en').format('dddd, MMMM D, YYYY');
    },
    selectedView(): 'list' | 'diagram' {
      return this.$route.query.view === 'diagram' ? 'diagram' : 'list';
    },
    firstAvailableDate(): string {
      return this.availableDates?.[0] || '';
    },
    latestAvailableDate(): string {
      return resolveLatestAvailableDate(this.availableDates);
    },
    previousDate(): string {
      return moment(this.selectedDate, 'YYYY-MM-DD', true).subtract(1, 'day').format('YYYY-MM-DD');
    },
    nextDate(): string {
      return moment(this.selectedDate, 'YYYY-MM-DD', true).add(1, 'day').format('YYYY-MM-DD');
    },
    orderedSessions(): CheckinSession[] {
      return [...this.sessions].sort((left, right) => {
        return moment(left?.started_at).valueOf() - moment(right?.started_at).valueOf();
      });
    },
    disablePrevious(): boolean {
      return !this.availableDates?.includes(this.previousDate);
    },
    disableNext(): boolean {
      return !this.availableDates?.includes(this.nextDate);
    },
  },
  watch: {
    date: {
      immediate: true,
      async handler() {
        if (this.date !== this.selectedDate) {
          await this.$router.replace(this.buildRoute(this.selectedDate));
          return;
        }
        await this.loadSessions();
      },
    },
  },
  methods: {
    buildRoute(date: string, view = this.selectedView) {
      return {
        path: `/checkins/${date}`,
        query: view === 'diagram' ? { view } : {},
      };
    },
    goToDate(date: string) {
      if (!canNavigateToCheckinDate(date, this.selectedDate, this.availableDates)) {
        return;
      }
      this.$router.push(this.buildRoute(date)).catch(() => undefined);
    },
    goToView(view: 'list' | 'diagram') {
      if (view === this.selectedView) return;
      this.$router.push(this.buildRoute(this.selectedDate, view)).catch(() => undefined);
    },
    async loadSessions() {
      const requestedDate = this.selectedDate;
      const startedRequest = beginCheckinsRequest(this.requestState);
      const requestId = startedRequest.requestId;
      this.requestState = startedRequest.state;
      this.loading = this.requestState.loading;
      this.error = '';
      try {
        const payload = await fetchCheckins(requestedDate);
        if (!isCurrentCheckinsRequest(this.requestState, requestId)) return;

        this.requestState = acceptCheckinsResponse(this.requestState, requestId, payload);
        const acceptedPayload = this.requestState.acceptedPayload;
        if (!acceptedPayload) return;

        this.availableDates = acceptedPayload.available_dates;
        const redirectDate = resolveCheckinsRedirectDate(
          requestedDate,
          acceptedPayload.available_dates
        );
        if (redirectDate) {
          this.sessions = [];
          await this.$router
            .replace(this.buildRoute(redirectDate))
            .catch(() => undefined);
          return;
        }

        this.sessions = acceptedPayload.sessions.filter(session => session.date === requestedDate);
      } catch (error) {
        if (!isCurrentCheckinsRequest(this.requestState, requestId)) return;
        console.error('Failed to load check-ins', error);
        this.availableDates = null;
        this.sessions = [];
        this.error = 'Failed to load check-ins.';
      } finally {
        this.requestState = finishCheckinsRequest(this.requestState, requestId);
        this.loading = this.requestState.loading;
      }
    },
  },
});
</script>
