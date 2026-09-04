<template>
  <div class="aw-review-page">
    <header class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <span class="aw-page-title">{{ formattedDate }}</span>
      <div class="flex items-center gap-3">
        <date-navigator
          :model-value="selectedDate"
          :min="firstAvailableDate"
          :max="latestAvailableDate"
          :available-dates="availableDates"
          :disable-previous="!previousAvailableDate"
          :disable-next="!nextAvailableDate"
          icon-only
          @previous="goToDate(previousAvailableDate)"
          @next="goToDate(nextAvailableDate)"
          @select="goToDate($event)"
        ></date-navigator>
        <theme-toggle-button floating></theme-toggle-button>
      </div>
    </header>

    <aw-alert v-if="error" show variant="warning">{{ error }}</aw-alert>

    <section v-if="loading" class="aw-card-muted px-6 py-8 text-sm text-foreground-muted">
      Loading review…
    </section>

    <template v-else-if="orderedHighlights.length">
      <section v-if="orderedHighlights.length" class="aw-review-section">
        <h2 class="aw-section-title aw-title-system">Highlights</h2>
        <div class="aw-review-highlight-grid">
          <review-highlight-card
            v-for="highlight in orderedHighlights"
            :key="highlight.id"
            :highlight="highlight"
          ></review-highlight-card>
        </div>
      </section>
    </template>

    <section v-else class="aw-card-muted px-6 py-10 text-center text-sm text-foreground-muted">
      No highlights for this day.
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import moment from 'moment';

import ReviewHighlightCard from '~/features/review/components/ReviewHighlightCard.vue';
import { fetchReview } from '~/features/review/lib/reviewClient';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import type { ReviewHighlight } from '~/shared/contracts/review.generated';
import DateNavigator from '~/shared/navigation/DateNavigator.vue';
import { resolveLatestAvailableDate } from '~/shared/navigation/dateAvailability';

const DATE_FORMAT = 'YYYY-MM-DD';
// This only reads the local video index; it never queues an SSH sync.
const LOCAL_REVIEW_REFRESH_MS = 5_000;

export default defineComponent({
  name: 'ReviewView',
  components: {
    DateNavigator,
    ReviewHighlightCard,
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
      availableDates: null as string[] | null,
      error: '',
      highlights: [] as ReviewHighlight[],
      latestRequestId: 0,
      loading: false,
      refreshTimer: null as number | null,
      refreshInFlight: false,
    };
  },
  computed: {
    selectedDate(): string {
      const parsed = moment(this.date, DATE_FORMAT, true);
      return parsed.isValid() ? parsed.format(DATE_FORMAT) : moment().format(DATE_FORMAT);
    },
    formattedDate(): string {
      return moment(this.selectedDate, DATE_FORMAT, true)
        .locale('en')
        .format('dddd, MMMM D, YYYY');
    },
    firstAvailableDate(): string {
      return this.availableDates?.[0] || '';
    },
    latestAvailableDate(): string {
      return resolveLatestAvailableDate(this.availableDates);
    },
    selectedDateIndex(): number {
      return this.availableDates?.indexOf(this.selectedDate) ?? -1;
    },
    previousAvailableDate(): string {
      if (!this.availableDates || this.selectedDateIndex <= 0) return '';
      return this.availableDates[this.selectedDateIndex - 1] || '';
    },
    nextAvailableDate(): string {
      if (!this.availableDates || this.selectedDateIndex < 0) return '';
      return this.availableDates[this.selectedDateIndex + 1] || '';
    },
    orderedHighlights(): ReviewHighlight[] {
      return [...this.highlights].sort((left, right) =>
        left.recorded_at.localeCompare(right.recorded_at)
      );
    },
  },
  mounted() {
    window.addEventListener('focus', this.refreshVisibleReview);
    document.addEventListener('visibilitychange', this.refreshVisibleReview);
    this.refreshTimer = window.setInterval(this.refreshVisibleReview, LOCAL_REVIEW_REFRESH_MS);
  },
  beforeUnmount() {
    this.latestRequestId += 1;
    if (this.refreshTimer !== null) window.clearInterval(this.refreshTimer);
    window.removeEventListener('focus', this.refreshVisibleReview);
    document.removeEventListener('visibilitychange', this.refreshVisibleReview);
  },
  watch: {
    date: {
      immediate: true,
      async handler() {
        if (this.date !== this.selectedDate) {
          await this.$router.replace(`/review/${this.selectedDate}`);
          return;
        }
        await this.loadReview();
      },
    },
  },
  methods: {
    async refreshVisibleReview() {
      if (document.hidden || this.loading || this.refreshInFlight) return;
      this.refreshInFlight = true;
      try {
        await this.loadReview(true);
      } finally {
        this.refreshInFlight = false;
      }
    },
    goToDate(date: string) {
      if (!date || date === this.selectedDate || !this.availableDates?.includes(date)) return;
      this.$router.push(`/review/${date}`).catch(() => undefined);
    },
    async loadReview(silent = false) {
      const requestId = ++this.latestRequestId;
      const requestedDate = this.selectedDate;
      if (!silent) this.loading = true;
      this.error = '';
      try {
        const payload = await fetchReview(requestedDate);
        if (requestId !== this.latestRequestId || requestedDate !== this.selectedDate) return;
        this.availableDates = payload.available_dates;

        if (
          !silent &&
          payload.available_dates.length > 0 &&
          !payload.available_dates.includes(requestedDate)
        ) {
          await this.$router.replace(
            `/review/${resolveLatestAvailableDate(payload.available_dates)}`
          );
          return;
        }

        this.highlights = payload.highlights.filter(item => item.date === requestedDate);
      } catch (error) {
        if (requestId !== this.latestRequestId || requestedDate !== this.selectedDate) return;
        console.error('Failed to load review', error);
        if (!silent) {
          this.availableDates = null;
          this.highlights = [];
        }
        this.error = 'Failed to load review.';
      } finally {
        if (requestId === this.latestRequestId) this.loading = false;
      }
    },
  },
});
</script>
