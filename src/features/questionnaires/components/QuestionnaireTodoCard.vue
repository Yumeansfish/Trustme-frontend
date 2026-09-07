<template>
  <div class="aw-questionnaire-todo-shell">
    <button
      class="aw-settings-card aw-questionnaire-todo-card aw-interactive-card"
      type="button"
      :aria-label="cardAriaLabel"
      :disabled="pendingCount === 0"
      @click="$emit('activate')"
    >
      <div class="aw-questionnaire-todo-row">
        <div class="flex min-w-0 items-center gap-4">
          <span class="aw-questionnaire-todo-icon-wrap">
            <span class="aw-settings-card-icon">
              <icon class="h-5 w-5" name="list"></icon>
            </span>
            <span
              v-if="pendingCount > 0"
              class="aw-questionnaire-todo-badge"
              :aria-label="`${pendingCount} pending tasks`"
            >
              {{ badgeLabel }}
            </span>
          </span>
          <h2 class="aw-title-system text-xl font-semibold text-foreground-strong">
            To do
          </h2>
        </div>
        <span class="aw-questionnaire-todo-status" :class="{ 'text-danger': error }">
          {{ statusLabel }}
        </span>
      </div>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'QuestionnaireTodoCard',
  props: {
    pendingCount: {
      type: Number,
      default: 0,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['activate'],
  computed: {
    badgeLabel(): string {
      return this.pendingCount > 99 ? '99+' : String(this.pendingCount);
    },
    statusLabel(): string {
      if (this.loading) return 'Checking…';
      if (this.pendingCount > 0) return `${this.pendingCount} pending`;
      if (this.error) return 'Unavailable';
      return 'All done';
    },
    cardAriaLabel(): string {
      if (this.pendingCount === 0) return 'To do, no pending tasks';
      return `To do, ${this.pendingCount} pending tasks`;
    },
  },
});
</script>

<style scoped>
.aw-questionnaire-todo-card {
  display: block;
  width: 100%;
  min-height: clamp(7.5rem, 12vh, 10rem);
  height: 100%;
  color: inherit;
  text-align: left;
  transition: border-color var(--duration-fast), background-color var(--duration-fast),
    box-shadow var(--duration-fast), transform var(--duration-fast);
}

.aw-questionnaire-todo-shell {
  height: 100%;
}

.aw-questionnaire-todo-card:not(:disabled):hover {
  border-color: rgb(var(--summary-vis-normal) / 0.22);
  transform: translateY(-1px);
}

.aw-questionnaire-todo-card:disabled {
  cursor: default;
}

.aw-questionnaire-todo-card:focus-visible {
  outline: 2px solid rgb(var(--summary-vis-normal));
  outline-offset: 3px;
}

.aw-questionnaire-todo-row {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.aw-questionnaire-todo-icon-wrap {
  position: relative;
  flex: 0 0 auto;
}

.aw-questionnaire-todo-badge {
  position: absolute;
  top: -0.5rem;
  right: -0.55rem;
  display: inline-flex;
  min-width: 1.25rem;
  height: 1.25rem;
  align-items: center;
  justify-content: center;
  padding: 0 0.3rem;
  border: 2px solid rgb(var(--surface));
  border-radius: 9999px;
  background-color: rgb(var(--danger));
  color: white;
  font-size: 0.65rem;
  font-weight: 750;
  line-height: 1;
}

.aw-questionnaire-todo-status {
  flex-shrink: 0;
  color: rgb(var(--summary-vis-normal));
  font-size: 0.84rem;
  font-weight: 700;
}
</style>
