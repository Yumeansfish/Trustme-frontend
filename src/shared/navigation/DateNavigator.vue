<template>
  <div
    ref="root"
    class="aw-pill-control aw-date-nav"
    :class="[
      fieldMode ? 'aw-date-nav-field' : '',
      invalid ? 'aw-date-nav-invalid' : '',
      disabled ? 'aw-date-nav-disabled' : '',
    ]"
  >
    <ui-button
      v-if="!fieldMode"
      class="aw-icon-button h-7 w-7 rounded-full disabled:opacity-40"
      type="button"
      :disabled="disablePrevious"
      aria-label="Previous period"
      @click="$emit('previous')"
    >
      <icon class="h-3 w-3" name="chevron-left"></icon>
    </ui-button>

    <div class="relative">
      <button
        ref="trigger"
        class="aw-date-nav-trigger"
        :class="[
          iconOnly ? 'aw-date-nav-trigger-icon' : '',
          fieldMode ? 'aw-date-nav-trigger-field' : '',
        ]"
        type="button"
        :title="formattedValue"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        :aria-expanded="isOpen"
        aria-haspopup="dialog"
        @click="togglePopover"
      >
        <icon class="h-3.5 w-3.5 shrink-0" name="calendar"></icon>
        <span v-if="!iconOnly" class="min-w-0 flex-1 truncate text-left">
          {{ formattedValue }}
        </span>
        <icon
          v-if="!iconOnly"
          class="h-3.5 w-3.5 shrink-0 transition-transform"
          :class="isOpen ? 'rotate-90' : ''"
          name="chevron-right"
        ></icon>
      </button>

      <div v-if="isOpen" class="aw-date-popover" role="dialog" aria-label="Choose a date">
        <div class="aw-date-popover-header">
          <button
            class="aw-date-popover-nav"
            type="button"
            :disabled="!canGoPreviousMonth"
            aria-label="Previous month"
            @click="showPreviousMonth"
          >
            <icon class="h-4 w-4" name="chevron-left"></icon>
          </button>
          <div class="aw-date-popover-title">{{ visibleMonthLabel }}</div>
          <button
            class="aw-date-popover-nav"
            type="button"
            :disabled="!canGoNextMonth"
            aria-label="Next month"
            @click="showNextMonth"
          >
            <icon class="h-4 w-4" name="chevron-right"></icon>
          </button>
        </div>

        <div class="aw-date-weekdays" aria-hidden="true">
          <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
        </div>

        <div class="aw-date-grid">
          <button
            v-for="day in calendarDays"
            :key="day.iso"
            type="button"
            :data-date="day.iso"
            :disabled="day.disabled"
            :aria-label="day.accessibleLabel"
            :aria-selected="day.isSelected"
            :aria-current="day.isToday ? 'date' : undefined"
            :class="[
              'aw-date-cell',
              day.inMonth ? '' : 'aw-date-cell-outside',
              day.disabled ? 'aw-date-cell-disabled' : '',
              markedDates.includes(day.iso) ? 'aw-date-cell-marked' : '',
              day.isToday ? 'aw-date-cell-today' : '',
              day.isSelected ? 'aw-date-cell-selected' : '',
            ]"
            @click="selectDate(day.iso)"
            @keydown="handleDayKeydown($event, day.iso)"
          >
            {{ day.label }}
          </button>
        </div>

        <div
          class="aw-date-popover-footer"
          :class="clearable && hasSelectedDate ? 'aw-date-popover-footer-split' : ''"
        >
          <button
            v-if="clearable && hasSelectedDate"
            class="aw-date-popover-clear"
            type="button"
            @click="clearDate"
          >
            Clear
          </button>
          <button
            class="aw-date-popover-action"
            type="button"
            :disabled="!latestSelectableDate"
            @click="jumpToLatest"
          >
            {{ latestLabel }}
          </button>
        </div>
      </div>
    </div>

    <ui-button
      v-if="!fieldMode"
      class="aw-icon-button h-7 w-7 rounded-full disabled:opacity-40"
      type="button"
      :disabled="disableNext"
      aria-label="Next period"
      @click="$emit('next')"
    >
      <icon class="h-3 w-3" name="chevron-right"></icon>
    </ui-button>
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from 'vue';
import { useDateNavigator } from '~/shared/navigation/useDateNavigator';

export default defineComponent({
  name: 'DateNavigator',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    min: {
      type: String,
      default: '',
    },
    max: {
      type: String,
      default: '',
    },
    availableDates: {
      type: Array as PropType<string[] | null | undefined>,
      default: undefined,
    },
    markedDates: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    disablePrevious: {
      type: Boolean,
      default: false,
    },
    disableNext: {
      type: Boolean,
      default: false,
    },
    iconOnly: {
      type: Boolean,
      default: false,
    },
    fieldMode: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    invalid: {
      type: Boolean,
      default: false,
    },
    clearable: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: 'Select date',
    },
    latestLabel: {
      type: String,
      default: 'Latest',
    },
  },
  emits: ['next', 'previous', 'select', 'update:modelValue'],
  setup(props, context) {
    return useDateNavigator(props, context);
  },
});
</script>
