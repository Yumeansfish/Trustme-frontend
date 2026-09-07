<template>
  <ui-button
    class="aw-btn aw-btn-sm aw-btn-secondary"
    type="button"
    :disabled="submitting"
    @click="triggerNotification"
  >
    {{ label }}
  </ui-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { previewQuestionnaireNotification } from '~/app/devtools/notificationPreviewClient';

type TestState = 'idle' | 'submitting' | 'waiting' | 'failed';

export default defineComponent({
  name: 'QuestionnaireNotificationTestButton',
  data() {
    return {
      state: 'idle' as TestState,
      resetTimer: null as number | null,
    };
  },
  computed: {
    submitting(): boolean {
      return this.state === 'submitting' || this.state === 'waiting';
    },
    label(): string {
      if (this.state === 'submitting') return 'Sending…';
      if (this.state === 'waiting') return 'Notification queued';
      if (this.state === 'failed') return 'Try notification again';
      return 'Test questionnaire notification';
    },
  },
  beforeUnmount() {
    if (this.resetTimer !== null) window.clearTimeout(this.resetTimer);
  },
  methods: {
    async triggerNotification() {
      this.state = 'submitting';
      try {
        await previewQuestionnaireNotification();
        this.state = 'waiting';
      } catch (error) {
        console.error('Failed to preview questionnaire notification', error);
        this.state = 'failed';
      }
      this.scheduleReset();
    },
    scheduleReset() {
      if (this.resetTimer !== null) window.clearTimeout(this.resetTimer);
      this.resetTimer = window.setTimeout(() => {
        this.state = 'idle';
        this.resetTimer = null;
      }, 4000);
    },
  },
});
</script>
