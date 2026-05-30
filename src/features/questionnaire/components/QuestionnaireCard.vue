<template>
  <article class="aw-shortcut-card aw-questionnaire-card cursor-default">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
        <span class="aw-questionnaire-status-pill" :class="submitted ? 'aw-questionnaire-status-pill-complete' : ''">
          {{ submitted ? 'Submitted' : 'Pending' }}
        </span>
        <span class="aw-checkins-session-pill">{{ completionLabel }}</span>
      </div>
    </div>

    <aw-alert v-if="submitError" show variant="warning">{{ submitError }}</aw-alert>

    <section v-if="globalQuestions.length" class="aw-questionnaire-global-question">
      <div class="text-sm font-semibold leading-6 text-foreground-emphasis">
        {{ globalQuestions[0].text }}
      </div>
      <div class="aw-questionnaire-option-grid">
        <button
          v-for="option in globalQuestions[0].options"
          :key="option.id"
          type="button"
          class="aw-questionnaire-option"
          :class="selectedGlobalOptionId(globalQuestions[0].id) === option.id ? 'aw-questionnaire-option-selected' : ''"
          :disabled="submitted"
          @click="selectGlobalOption(globalQuestions[0].id, option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <div class="aw-questionnaire-video-strip">
      <section
        v-for="section in sections"
        :key="section.video.video_id"
        class="aw-questionnaire-video-card"
        :class="{
          'aw-questionnaire-video-card-active': activeVideoId === section.video.video_id,
          'aw-questionnaire-video-card-complete': isSectionComplete(section),
        }"
      >
        <div class="aw-questionnaire-video-card-header">
          <span class="aw-checkins-session-pill">{{ formatRecordedTime(section.video) }}</span>
          <ui-button
            class="aw-btn aw-btn-sm aw-btn-away-session shrink-0"
            type="button"
            :disabled="!section.video.recorded_at"
            @click="openTimeline(section.video)"
          >
            <icon name="calendar-day" class="mr-1.5 h-4 w-4"></icon>
            <span>View Activity Around This Time</span>
          </ui-button>
        </div>

        <div class="aw-questionnaire-video-shell aw-questionnaire-video-shell-thumbnail">
          <video
            class="aw-questionnaire-video"
            controls
            preload="metadata"
            playsinline
            :src="section.video.video_url"
          ></video>
        </div>

        <button
          type="button"
          class="aw-questionnaire-video-card-toggle"
          @click="toggleSection(section.video.video_id)"
        >
          <span class="aw-questionnaire-status-pill" :class="isSectionComplete(section) ? 'aw-questionnaire-status-pill-complete' : ''">
            {{ isSectionComplete(section) ? 'Complete' : 'Incomplete' }}
          </span>
          <span class="inline-flex items-center gap-2 text-sm font-semibold text-foreground-subtle">
            <span>Questionnaire</span>
            <icon
              name="chevron-right"
              class="h-4 w-4 transition-transform duration-150"
              :class="activeVideoId === section.video.video_id ? 'rotate-90' : ''"
            ></icon>
          </span>
        </button>
      </section>
    </div>

    <section v-if="activeSection" class="aw-questionnaire-expanded">
      <div class="aw-questionnaire-form-grid">
        <section
          v-for="question in videoQuestions"
          :key="`${activeSection.video.video_id}:${question.id}`"
          class="aw-questionnaire-question"
        >
          <div class="text-sm font-semibold leading-6 text-foreground-emphasis">
            {{ question.text }}
          </div>
          <div class="aw-questionnaire-option-grid">
            <button
              v-for="option in question.options"
              :key="option.id"
              type="button"
              class="aw-questionnaire-option"
              :class="selectedOptionId(activeSection.video.video_id, question.id) === option.id ? 'aw-questionnaire-option-selected' : ''"
              :disabled="submitted"
              @click="selectOption(activeSection.video.video_id, question.id, option.id)"
            >
              {{ option.label }}
            </button>
          </div>
        </section>
      </div>
    </section>

    <div class="flex justify-end pt-2">
      <ui-button
        class="aw-btn aw-btn-md"
        :class="canSubmit && !submitted && !submitting ? 'aw-btn-away-session' : 'aw-questionnaire-submit-muted'"
        type="button"
        :disabled="!canSubmit || submitted || submitting"
        @click="submitQuestionnaire"
      >
        <span v-if="submitted">Submitted</span>
        <span v-else-if="submitting">Submitting...</span>
        <span v-else>Submit questionnaire</span>
      </ui-button>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import moment from 'moment';

import { getClient } from '~/app/lib/awclient';
import type {
  QuestionnaireGlobalAnswerSubmission,
  QuestionnaireAnswerSubmission,
  QuestionnaireInstance,
  QuestionnaireTemplate,
  QuestionnaireVideo,
  QuestionnaireVideoAnswerSubmission,
} from '~/features/questionnaire/lib/types';

interface QuestionnaireSection {
  status: 'pending' | 'completed';
  video: QuestionnaireVideo;
}

export default defineComponent({
  name: 'QuestionnaireCard',
  emits: ['submitted'],
  props: {
    questionnaireInstances: {
      type: Array as () => QuestionnaireInstance[],
      required: true,
    },
    questionnaireTemplate: {
      type: Object as () => QuestionnaireTemplate,
      required: true,
    },
  },
  data() {
    return {
      globalAnswers: {} as Record<string, string>,
      answersByVideo: {} as Record<string, Record<string, string>>,
      submitError: '',
      submitting: false,
      localSubmitted: false,
      activeVideoId: '' as string,
      localCompletedQuestionnaireIds: new Set<string>(),
    };
  },
  computed: {
    questionnaireKey(): string {
      return this.questionnaireInstances
        .map(instance => `${instance.survey_id}:${instance.status}:${instance.videos.map(video => video.video_id).join(',')}`)
        .join('|');
    },
    sections(): QuestionnaireSection[] {
      return this.questionnaireInstances
        .flatMap(instance =>
          instance.videos.map(video => ({
            status: this.localCompletedQuestionnaireIds.has(instance.survey_id) ? 'completed' : instance.status,
            video,
          }))
        )
        .sort((a, b) => {
          const left = a.video.recorded_at || a.video.filename;
          const right = b.video.recorded_at || b.video.filename;
          return left.localeCompare(right);
        });
    },
    activeSection(): QuestionnaireSection | null {
      return this.sections.find(section => section.video.video_id === this.activeVideoId) || null;
    },
    globalQuestions() {
      return this.questionnaireTemplate.global_questions?.length
        ? this.questionnaireTemplate.global_questions
        : [];
    },
    videoQuestions() {
      return this.questionnaireTemplate.video_questions;
    },
    submitted(): boolean {
      if (this.localSubmitted) return true;
      return this.sections.length > 0 && this.sections.every(section => section.status === 'completed');
    },
    completionLabel(): string {
      const completed = this.sections.filter(section => this.isSectionComplete(section)).length;
      return `${completed}/${this.sections.length} videos complete`;
    },
    canSubmit(): boolean {
      const globalReady = this.globalQuestions.every(
        question => typeof this.globalAnswers[question.id] === 'string' && this.globalAnswers[question.id].length > 0
      );
      return globalReady && this.sections.length > 0 && this.sections.every(section => this.isSectionComplete(section));
    },
  },
  watch: {
    questionnaireKey: {
      immediate: true,
      handler() {
        this.globalAnswers = {};
        this.answersByVideo = {};
        this.submitError = '';
        this.submitting = false;
        this.localSubmitted = false;
        this.localCompletedQuestionnaireIds = new Set<string>();
      },
    },
    sections: {
      immediate: true,
      handler(sections: QuestionnaireSection[]) {
        if (!sections.length) {
          this.activeVideoId = '';
          return;
        }
        if (this.activeVideoId && sections.some(section => section.video.video_id === this.activeVideoId)) {
          return;
        }
        this.activeVideoId = '';
      },
    },
  },
  methods: {
    formatRecordedTime(video: QuestionnaireVideo): string {
      if (!video.recorded_at) return 'Video';
      return moment.parseZone(video.recorded_at).format('HH:mm');
    },
    toggleSection(videoId: string) {
      this.activeVideoId = this.activeVideoId === videoId ? '' : videoId;
    },
    selectedOptionId(videoId: string, questionId: string): string {
      return this.answersByVideo[videoId]?.[questionId] || '';
    },
    selectedGlobalOptionId(questionId: string): string {
      return this.globalAnswers[questionId] || '';
    },
    selectGlobalOption(questionId: string, optionId: string) {
      if (this.submitted) return;
      this.globalAnswers = {
        ...this.globalAnswers,
        [questionId]: optionId,
      };
    },
    selectOption(videoId: string, questionId: string, optionId: string) {
      if (this.submitted) return;
      this.answersByVideo = {
        ...this.answersByVideo,
        [videoId]: {
          ...(this.answersByVideo[videoId] || {}),
          [questionId]: optionId,
        },
      };
    },
    isSectionComplete(section: QuestionnaireSection): boolean {
      if (section.status === 'completed') return true;
      const answers = this.answersByVideo[section.video.video_id] || {};
      return this.videoQuestions.every(question => typeof answers[question.id] === 'string' && answers[question.id].length > 0);
    },
    buildAnswersPayload(videoId: string): QuestionnaireAnswerSubmission[] {
      const answers = this.answersByVideo[videoId] || {};
      return this.videoQuestions.map(question => ({
        question_id: question.id,
        option_id: answers[question.id],
      }));
    },
    buildGlobalAnswersPayload(): QuestionnaireGlobalAnswerSubmission[] {
      return this.globalQuestions.map(question => ({
        question_id: question.id,
        option_id: this.globalAnswers[question.id],
      }));
    },
    buildVideoAnswersPayload(): QuestionnaireVideoAnswerSubmission[] {
      return this.sections.map(section => ({
        video_id: section.video.video_id,
        answers: this.buildAnswersPayload(section.video.video_id),
      }));
    },
    async submitQuestionnaire() {
      if (!this.canSubmit || this.submitted || this.submitting) return;
      this.submitError = '';
      this.submitting = true;
      try {
        const primaryQuestionnaireId = this.questionnaireInstances[0]?.survey_id;
        if (!primaryQuestionnaireId || this.questionnaireInstances.length !== 1) {
          throw new Error('Missing questionnaire identifier');
        }
        await getClient().req.post('/0/questionnaires/answers', {
          survey_id: primaryQuestionnaireId,
          global_answers: this.buildGlobalAnswersPayload(),
          video_answers: this.buildVideoAnswersPayload(),
        });
        this.localCompletedQuestionnaireIds = new Set(
          this.questionnaireInstances.map(instance => instance.survey_id)
        );
        this.localSubmitted = true;
        window.dispatchEvent(new Event('questionnaire:changed'));
        this.$emit('submitted');
      } catch (error) {
        console.error('Failed to submit questionnaire', error);
        this.submitError = 'Failed to submit questionnaire.';
      } finally {
        this.submitting = false;
      }
    },
    openTimeline(video: QuestionnaireVideo) {
      if (!video.recorded_at) {
        return;
      }

      const center = moment.parseZone(video.recorded_at, moment.ISO_8601, true);
      if (!center.isValid()) {
        return;
      }

      const start = center.clone().subtract(3, 'minutes');
      const end = center.clone().add(3, 'minutes');
      const scope =
        typeof this.$route.query.scope === 'string'
          ? this.$route.query.scope
          : typeof this.$route.query.host === 'string'
            ? this.$route.query.host
            : '';

      this.$router.push({
        path: '/timeline',
        query: {
          start: start.format(),
          end: end.format(),
          ...(scope ? { scope } : {}),
          returnTo: this.$route.fullPath,
          returnLabel: 'Questionnaire',
        },
      }).catch(() => undefined);
    },
  },
});
</script>
