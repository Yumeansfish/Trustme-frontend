<template>
  <article class="aw-shortcut-card aw-checkins-session-card">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
          <span class="aw-checkins-session-pill">{{ sessionMetaLabel }}</span>
        </div>
      </div>

      <ui-button class="aw-btn aw-btn-sm aw-btn-away-session shrink-0" type="button" @click="openTimeline">
        <icon name="calendar-day" class="mr-1.5 h-4 w-4"></icon>
        <span>View Activity Around This Time</span>
      </ui-button>
    </div>

    <div class="aw-checkins-answer-grid">
      <article
        v-for="answer in visibleAnswers"
        :key="`${session.id}-${answer.question_id}`"
        class="aw-checkins-answer-card"
        :class="{ 'aw-checkins-answer-card-muted': answer.status !== 'answered' }"
      >
        <div class="aw-checkins-answer-card-top">
          <div class="aw-checkins-answer-visual">
            <div class="aw-checkins-answer-emoji">
              {{ answerEmoji(answer) }}
            </div>
            <div v-if="answer.progress !== null" class="aw-checkins-progress-track">
              <div class="aw-checkins-progress-bar" :style="{ width: `${answer.progress}%` }"></div>
            </div>
          </div>
          <div class="min-w-0 space-y-1 text-center">
            <div class="text-[0.95rem] font-semibold text-foreground-emphasis">
              {{ answer.label }}
            </div>
            <div class="text-xs text-foreground-subtle">{{ answer.value_label }}</div>
          </div>
        </div>
      </article>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CheckInSessionCard',
  props: {
    session: {
      type: Object,
      required: true,
    },
  },
  computed: {
    startedAt(): Date {
      return new Date(this.session.started_at);
    },
    visibleAnswers(): Array<Record<string, any>> {
      if (!Array.isArray(this.session.answers)) {
        return [];
      }

      return this.session.answers
        .filter(answer => answer?.status !== 'skipped')
        .sort((left, right) => {
          const leftIsSleep = String(left?.question_id || '').toUpperCase() === 'SLEEP';
          const rightIsSleep = String(right?.question_id || '').toUpperCase() === 'SLEEP';
          if (leftIsSleep !== rightIsSleep) {
            return leftIsSleep ? -1 : 1;
          }

          const leftIndex = Number(left?.question_id);
          const rightIndex = Number(right?.question_id);
          if (Number.isFinite(leftIndex) && Number.isFinite(rightIndex)) {
            return leftIndex - rightIndex;
          }
          return String(left?.label || '').localeCompare(String(right?.label || ''));
        });
    },
    timeRangeLabel(): string {
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return formatter.format(this.startedAt);
    },
    sessionMetaLabel(): string {
      return this.timeRangeLabel;
    },
  },
  methods: {
    answerEmoji(answer: Record<string, any>) {
      const score = Number(answer?.value);
      if (!Number.isFinite(score)) return '◌';
      if (score <= 1) return '☹';
      if (score === 2) return '◔';
      if (score === 3) return '◑';
      if (score === 4) return '◕';
      return '☺';
    },
    openTimeline() {
      const scope =
        typeof this.$route.query.scope === 'string'
          ? this.$route.query.scope
          : typeof this.$route.query.host === 'string'
            ? this.$route.query.host
            : '';
      this.$router.push({
        path: '/timeline',
        query: {
          start: this.session.timeline_start,
          end: this.session.timeline_end,
          ...(scope ? { scope } : {}),
          returnTo: this.$route.fullPath,
          returnLabel: 'Check-ins',
        },
      }).catch(() => undefined);
    },
  },
});
</script>
