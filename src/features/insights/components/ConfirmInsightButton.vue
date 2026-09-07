<template>
  <div class="space-y-2">
    <ui-button type="button" class="aw-btn aw-btn-sm aw-btn-secondary w-full"
      :aria-label="`Confirm ${title}`" :disabled="confirmed || saving" @click="confirm">
      {{ confirmed ? 'Confirmed' : saving ? 'Confirming…' : 'Confirm' }}
    </ui-button>
    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import UiButton from '~/shared/ui/Button.vue';
import { confirmInsight } from '~/features/daily-check-in/lib/dailyCheckInClient';
import type { InsightConfirmationState } from '~/shared/contracts/model-output.generated';

const props = defineProps<{
  date: string; periodId: string; target: string; title: string;
  progress: InsightConfirmationState; nowMs: number;
}>();
const emit = defineEmits<{ confirmed: [state: InsightConfirmationState] }>();
const saving = ref(false);
const error = ref('');
const confirmed = computed(() => props.progress.confirmed_targets.includes(props.target));
async function confirm() {
  if (saving.value || confirmed.value) return;
  saving.value = true;
  error.value = '';
  try {
    emit('confirmed', await confirmInsight(props.date, props.periodId, props.target));
  } catch {
    error.value = 'Could not confirm this suggestion. Please try again.';
  } finally {
    saving.value = false;
  }
}
</script>
