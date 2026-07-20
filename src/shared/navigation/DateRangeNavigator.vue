<template>
  <div ref="root" class="aw-pill-control aw-date-nav">
    <div class="relative">
      <button
        ref="trigger"
        class="aw-date-nav-trigger"
        :class="iconOnly ? 'aw-date-nav-trigger-icon' : ''"
        type="button"
        :title="formattedValue"
        :aria-expanded="isOpen"
        aria-haspopup="dialog"
        @click="togglePopover"
      >
        <icon class="h-3.5 w-3.5 shrink-0" name="calendar"></icon>
        <span v-if="!iconOnly" class="truncate">{{ formattedValue }}</span>
        <icon
          v-if="!iconOnly"
          class="h-3.5 w-3.5 shrink-0 transition-transform"
          :class="isOpen ? 'rotate-90' : ''"
          name="chevron-right"
        ></icon>
      </button>

      <div
        v-if="isOpen"
        class="aw-date-popover aw-date-range-popover"
        role="dialog"
        aria-label="Choose a date range"
        @click.stop
      >
        <div class="aw-date-popover-header">
          <button
            class="aw-date-popover-nav"
            type="button"
            :disabled="!canNavigatePreviousWindow"
            :aria-label="isMonthPickerOpen ? 'Previous year' : 'Previous month'"
            @click="navigateWindow('previous')"
          >
            <icon class="h-4 w-4" name="chevron-left"></icon>
          </button>
          <button
            class="aw-date-popover-title-button"
            type="button"
            :aria-expanded="isMonthPickerOpen"
            aria-label="Choose visible months"
            @click="toggleMonthPicker"
          >
            <span class="truncate">{{ visibleWindowLabel }}</span>
            <icon
              class="h-3.5 w-3.5 shrink-0 transition-transform"
              :class="isMonthPickerOpen ? 'rotate-90' : ''"
              name="chevron-right"
            ></icon>
          </button>
          <button
            class="aw-date-popover-nav"
            type="button"
            :disabled="!canNavigateNextWindow"
            :aria-label="isMonthPickerOpen ? 'Next year' : 'Next month'"
            @click="navigateWindow('next')"
          >
            <icon class="h-4 w-4" name="chevron-right"></icon>
          </button>
        </div>

        <div v-if="isMonthPickerOpen" class="aw-date-range-grid aw-date-range-grid-separated">
          <section>
            <div class="aw-date-month-grid">
              <button
                v-for="month in startMonthOptions"
                :key="month.key"
                type="button"
                  :disabled="month.disabled"
                  :aria-label="month.accessibleLabel"
                  :aria-selected="month.isSelected"
                :class="[
                  'aw-date-month-cell',
                  month.disabled ? 'aw-date-month-cell-disabled' : '',
                  month.isSelected ? 'aw-date-month-cell-selected' : '',
                ]"
                @click="jumpToVisibleMonth(month.iso, 'start')"
              >
                {{ month.label }}
              </button>
            </div>
          </section>

          <section>
            <div class="aw-date-month-grid">
              <button
                v-for="month in endMonthOptions"
                :key="month.key"
                type="button"
                  :disabled="month.disabled"
                  :aria-label="month.accessibleLabel"
                  :aria-selected="month.isSelected"
                :class="[
                  'aw-date-month-cell',
                  month.disabled ? 'aw-date-month-cell-disabled' : '',
                  month.isSelected ? 'aw-date-month-cell-selected' : '',
                ]"
                @click="jumpToVisibleMonth(month.iso, 'end')"
              >
                {{ month.label }}
              </button>
            </div>
          </section>
        </div>

        <div v-else class="aw-date-range-grid aw-date-range-grid-separated">
          <section>
            <div class="aw-date-grid">
              <button
                v-for="day in startCalendarDays"
                :key="`start-${day.iso}`"
                type="button"
                :data-date="day.iso"
                :disabled="day.disabled"
                :aria-label="day.accessibleLabel"
                :aria-selected="day.isSelected"
                :aria-current="day.isToday ? 'date' : undefined"
                :class="[
                  'aw-date-cell',
                  day.disabled ? 'aw-date-cell-disabled' : '',
                  day.isToday ? 'aw-date-cell-today' : '',
                  day.isInRange ? 'aw-date-cell-in-range' : '',
                  day.isSelected ? 'aw-date-cell-selected' : '',
                ]"
                @click="selectDate(day.iso)"
                @keydown="handleDayKeydown($event, day.iso)"
              >
                {{ day.label }}
              </button>
            </div>
          </section>

          <section>
            <div class="aw-date-grid">
              <button
                v-for="day in endCalendarDays"
                :key="`end-${day.iso}`"
                type="button"
                :data-date="day.iso"
                :disabled="day.disabled"
                :aria-label="day.accessibleLabel"
                :aria-selected="day.isSelected"
                :aria-current="day.isToday ? 'date' : undefined"
                :class="[
                  'aw-date-cell',
                  day.disabled ? 'aw-date-cell-disabled' : '',
                  day.isToday ? 'aw-date-cell-today' : '',
                  day.isInRange ? 'aw-date-cell-in-range' : '',
                  day.isSelected ? 'aw-date-cell-selected' : '',
                ]"
                @click="selectDate(day.iso)"
                @keydown="handleDayKeydown($event, day.iso)"
              >
                {{ day.label }}
              </button>
            </div>
          </section>
        </div>

        <div class="aw-date-range-selection" aria-live="polite">
          {{ draftRangeDisplay }}
        </div>

        <div class="aw-date-popover-footer aw-date-range-footer">
          <button class="aw-date-popover-action" type="button" @click="cancel">Cancel</button>
          <button
            class="aw-date-popover-action aw-date-popover-apply"
            type="button"
            :disabled="!canApply"
            :class="canApply ? 'aw-date-popover-apply-active' : 'aw-date-popover-apply-muted'"
            @click="applyRange"
          >
            Apply
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from 'vue';
import { useDateRangeNavigator } from '~/shared/navigation/useDateRangeNavigator';

export default defineComponent({
  name: 'DateRangeNavigator',
  props: {
    start: {
      type: String,
      required: true,
    },
    end: {
      type: String,
      required: true,
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
      default: () => [],
    },
    iconOnly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['select-range', 'close'],
  setup(props, context) {
    return useDateRangeNavigator(props, context);
  },
});
</script>
