<template>
  <button
    class="aw-settings-card aw-daily-check-in-card aw-interactive-card"
    :class="{ 'aw-daily-check-in-card-complete': checkedIn }"
    type="button"
    :disabled="checkedIn || disabled"
    :aria-label="`${checkedIn ? 'Checked in' : 'Check in'} for the ${session}`"
    @click="$emit('check-in')"
  >
    <div class="aw-daily-check-in-row">
      <div class="flex min-w-0 items-center gap-4">
        <span class="aw-settings-card-icon">
          <icon class="h-5 w-5" name="circle-check"></icon>
        </span>
        <div class="min-w-0 space-y-2">
          <h2 class="aw-title-system text-xl font-semibold text-foreground-strong">
            {{ session === 'morning' ? 'Morning check-in' : 'Afternoon check-in' }}
          </h2>
          <span class="aw-daily-check-in-status">
            {{ busy ? 'Saving…' : checkedIn ? 'Checked in' : closed ? 'Closed' : 'Check in' }}
          </span>
        </div>
      </div>
    </div>
    <p v-if="message" class="mt-3 text-sm text-foreground-muted">{{ message }}</p>
    <p v-if="error" class="mt-3 text-sm text-danger" role="alert">{{ error }}</p>
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'DailyCheckInCard',
  props: {
    session: { type: String, default: 'morning' },
    disabled: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    closed: { type: Boolean, default: false },
    message: { type: String, default: '' },
    error: { type: String, default: '' },
    checkedIn: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['check-in'],
});
</script>

<style scoped>
.aw-daily-check-in-card {
  display: block;
  width: 100%;
  min-height: clamp(7.5rem, 12vh, 10rem);
  color: inherit;
  text-align: left;
  transition: border-color var(--duration-fast), background-color var(--duration-fast),
    box-shadow var(--duration-fast), transform var(--duration-fast);
}

.aw-daily-check-in-card:hover:not(:disabled) {
  border-color: rgb(var(--summary-vis-normal) / 0.22);
  transform: translateY(-1px);
}

.aw-daily-check-in-card:focus-visible {
  outline: 2px solid rgb(var(--summary-vis-normal));
  outline-offset: 3px;
}

.aw-daily-check-in-card-complete {
  cursor: default;
  background-color: rgb(var(--summary-vis-normal) / 0.06);
}

.aw-daily-check-in-row {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.aw-daily-check-in-status {
  flex-shrink: 0;
  color: rgb(var(--summary-vis-normal));
  font-size: 0.84rem;
  font-weight: 700;
}
</style>
