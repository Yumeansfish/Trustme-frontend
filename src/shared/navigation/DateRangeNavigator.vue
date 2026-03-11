<template>
  <div ref="root" class="aw-pill-control aw-date-nav">
    <ui-button
      class="aw-icon-button h-7 w-7 rounded-full disabled:opacity-40"
      type="button"
      :disabled="true"
    >
      <icon class="h-3 w-3" name="chevron-left"></icon>
    </ui-button>

    <div class="relative">
      <button
        class="aw-date-nav-trigger"
        :class="iconOnly ? 'aw-date-nav-trigger-icon' : ''"
        type="button"
        :title="formattedValue"
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

      <div v-if="isOpen" class="aw-date-popover aw-date-range-popover" @click.stop>
        <div class="aw-date-popover-header">
          <button
            class="aw-date-popover-nav"
            type="button"
            :disabled="!canNavigatePreviousWindow"
            @click="navigateWindow('previous')"
          >
            <icon class="h-4 w-4" name="chevron-left"></icon>
          </button>
          <button class="aw-date-popover-title-button" type="button" @click="toggleMonthPicker">
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
                :disabled="day.disabled"
                :class="[
                  'aw-date-cell',
                  day.disabled ? 'aw-date-cell-disabled' : '',
                  day.isToday ? 'aw-date-cell-today' : '',
                  day.isInRange ? 'aw-date-cell-in-range' : '',
                  day.isSelected ? 'aw-date-cell-selected' : '',
                ]"
                @click="selectDate(day.iso)"
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
                :disabled="day.disabled"
                :class="[
                  'aw-date-cell',
                  day.disabled ? 'aw-date-cell-disabled' : '',
                  day.isToday ? 'aw-date-cell-today' : '',
                  day.isInRange ? 'aw-date-cell-in-range' : '',
                  day.isSelected ? 'aw-date-cell-selected' : '',
                ]"
                @click="selectDate(day.iso)"
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
            :aria-disabled="!canApply"
            :class="canApply ? 'aw-date-popover-apply-active' : 'aw-date-popover-apply-muted'"
            @click="applyRange"
          >
            Apply
          </button>
        </div>
      </div>
    </div>

    <ui-button
      class="aw-icon-button h-7 w-7 rounded-full disabled:opacity-40"
      type="button"
      :disabled="true"
    >
      <icon class="h-3 w-3" name="chevron-right"></icon>
    </ui-button>
  </div>
</template>

<script lang="ts">
import moment from 'moment';
import { PropType, computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { selectDateRangeBoundary } from '~/shared/navigation/dateRangeSelection';

type CalendarDay = {
  iso: string;
  label: string;
  inMonth: boolean;
  disabled: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
};

type MonthOption = {
  key: string;
  iso: string;
  label: string;
  disabled: boolean;
  isSelected: boolean;
};

const DATE_FORMAT = 'YYYY-MM-DD';

function parseDate(value: string) {
  return moment(value, DATE_FORMAT, true);
}

function formatRangeLabel(start: string, end: string) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate.isValid() || !endDate.isValid()) {
    return 'Select range';
  }
  if (startDate.isSame(endDate, 'day')) {
    return startDate.format('MMM D, YYYY');
  }
  return `${startDate.format('MMM D, YYYY')} - ${endDate.format('MMM D, YYYY')}`;
}

function formatDraftBoundary(value: string) {
  const parsed = parseDate(value);
  return parsed.isValid() ? parsed.format('MMM D, YYYY') : '';
}

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
      type: Array as PropType<string[]>,
      default: () => [],
    },
    iconOnly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['select-range', 'close'],
  setup(props, { emit, expose }) {
    const isOpen = ref(false);
    const isMonthPickerOpen = ref(false);
    const root = ref<HTMLElement | null>(null);
    const draftStart = ref(props.start);
    const draftEnd = ref(props.end);
    const pickedStartInSession = ref(false);
    const pickedEndInSession = ref(false);
    const visibleEndMonth = ref(moment().startOf('month'));

    const selectedStart = computed(() => parseDate(props.start));
    const selectedEnd = computed(() => parseDate(props.end));
    const minDate = computed(() => (props.min ? parseDate(props.min) : null));
    const maxDate = computed(() => (props.max ? parseDate(props.max) : null));
    const availableDateSet = computed(() => new Set(props.availableDates));
    const availableMonthSet = computed(() => new Set(props.availableDates.map(value => value.slice(0, 7))));
    const visibleStartMonth = computed(() => visibleEndMonth.value.clone().subtract(1, 'month'));
    const visibleStartMonthLabel = computed(() => visibleStartMonth.value.format('MMMM YYYY'));
    const visibleEndMonthLabel = computed(() => visibleEndMonth.value.format('MMMM YYYY'));
    const visibleWindowLabel = computed(
      () => `${visibleStartMonthLabel.value} - ${visibleEndMonthLabel.value}`
    );
    const formattedValue = computed(() => formatRangeLabel(props.start, props.end));
    const draftStartDate = computed(() => parseDate(draftStart.value));
    const draftEndDate = computed(() => parseDate(draftEnd.value));
    const draftRangeDisplay = computed(() => {
      const hasDraftStart =
        draftStartDate.value.isValid() &&
        (pickedStartInSession.value || draftStart.value === props.start);
      const hasDraftEnd =
        draftEndDate.value.isValid() &&
        (pickedEndInSession.value || draftEnd.value === props.end);
      const startLabel = hasDraftStart ? formatDraftBoundary(draftStart.value) : '';
      const endLabel = hasDraftEnd ? formatDraftBoundary(draftEnd.value) : '';

      if (startLabel && endLabel) {
        return `${startLabel} - ${endLabel}`;
      }
      return startLabel || endLabel;
    });

    const isDisabledDate = (date: moment.Moment) => {
      if (minDate.value && date.isBefore(minDate.value, 'day')) return true;
      if (maxDate.value && date.isAfter(maxDate.value, 'day')) return true;
      if (
        availableDateSet.value.size > 0 &&
        !availableDateSet.value.has(date.format(DATE_FORMAT))
      ) {
        return true;
      }
      return false;
    };

    const isOutsideMonthBounds = (month: moment.Moment) => {
      const monthStart = month.clone().startOf('month');
      const monthEnd = month.clone().endOf('month');
      if (minDate.value && monthEnd.isBefore(minDate.value, 'day')) return true;
      if (maxDate.value && monthStart.isAfter(maxDate.value, 'day')) return true;
      return false;
    };

    const hasAvailableMonthInYear = (year: moment.Moment) => {
      const yearStart = year.clone().startOf('year');
      return Array.from({ length: 12 }, (_, index) => yearStart.clone().month(index).startOf('month')).some(
        month =>
          !isOutsideMonthBounds(month) &&
          (availableMonthSet.value.size === 0 ||
            availableMonthSet.value.has(month.format('YYYY-MM')))
      );
    };

    const buildCalendarDays = (month: moment.Moment): CalendarDay[] => {
      const monthStart = month.clone().startOf('month');
      const today = moment().startOf('day');
      const daysInMonth = month.daysInMonth();

      return Array.from({ length: daysInMonth }, (_, index) => {
        const date = monthStart.clone().add(index, 'days');
        const iso = date.format(DATE_FORMAT);
        const hasOrderedRange =
          draftStartDate.value.isValid() &&
          draftEndDate.value.isValid() &&
          !draftEndDate.value.isBefore(draftStartDate.value, 'day');

        return {
          iso,
          label: date.format('D'),
          inMonth: date.month() === month.month(),
          disabled: isDisabledDate(date),
          isToday: date.isSame(today, 'day'),
          isSelected: iso === draftStart.value || iso === draftEnd.value,
          isInRange:
            Boolean(hasOrderedRange) &&
            date.isAfter(draftStartDate.value, 'day') &&
            date.isBefore(draftEndDate.value, 'day'),
        };
      });
    };

    const buildMonthOptions = (year: moment.Moment, role: 'start' | 'end'): MonthOption[] =>
      Array.from({ length: 12 }, (_, index) => {
        const month = year.clone().month(index).startOf('month');
        return {
          key: `${role}-${month.format('YYYY-MM')}`,
          iso: month.format(DATE_FORMAT),
          label: month.format('MMM'),
          disabled: isOutsideMonthBounds(month),
          isSelected:
            role === 'start'
              ? month.isSame(visibleStartMonth.value, 'month')
              : month.isSame(visibleEndMonth.value, 'month'),
        };
      });

    const startCalendarDays = computed(() => buildCalendarDays(visibleStartMonth.value));
    const endCalendarDays = computed(() => buildCalendarDays(visibleEndMonth.value));
    const startMonthOptions = computed(() =>
      buildMonthOptions(visibleStartMonth.value.clone().startOf('year'), 'start')
    );
    const endMonthOptions = computed(() =>
      buildMonthOptions(visibleEndMonth.value.clone().startOf('year'), 'end')
    );

    const canGoPreviousPair = computed(() => {
      if (!minDate.value) return true;
      return visibleStartMonth.value
        .clone()
        .subtract(1, 'month')
        .endOf('month')
        .isSameOrAfter(minDate.value, 'day');
    });

    const canGoNextPair = computed(() => {
      if (!maxDate.value) return true;
      return visibleEndMonth.value
        .clone()
        .add(1, 'month')
        .startOf('month')
        .isSameOrBefore(maxDate.value, 'day');
    });

    const canGoPreviousYearWindow = computed(() => {
      return (
        hasAvailableMonthInYear(visibleStartMonth.value.clone().subtract(12, 'months')) ||
        hasAvailableMonthInYear(visibleEndMonth.value.clone().subtract(12, 'months'))
      );
    });

    const canGoNextYearWindow = computed(() => {
      return (
        hasAvailableMonthInYear(visibleStartMonth.value.clone().add(12, 'months')) ||
        hasAvailableMonthInYear(visibleEndMonth.value.clone().add(12, 'months'))
      );
    });

    const canNavigatePreviousWindow = computed(() =>
      isMonthPickerOpen.value ? canGoPreviousYearWindow.value : canGoPreviousPair.value
    );

    const canNavigateNextWindow = computed(() =>
      isMonthPickerOpen.value ? canGoNextYearWindow.value : canGoNextPair.value
    );

    const canApply = computed(() => {
      if (!pickedStartInSession.value || !pickedEndInSession.value) {
        return false;
      }
      if (!draftStartDate.value.isValid() || !draftEndDate.value.isValid()) {
        return false;
      }
      if (draftEndDate.value.isBefore(draftStartDate.value, 'day')) {
        return false;
      }
      return !isDisabledDate(draftStartDate.value) && !isDisabledDate(draftEndDate.value);
    });

    const syncDraftFromProps = () => {
      draftStart.value = props.start;
      draftEnd.value = props.end;
      pickedStartInSession.value = false;
      pickedEndInSession.value = false;
      const latestAvailableDate =
        props.availableDates.length > 0 ? parseDate(props.availableDates[props.availableDates.length - 1]) : null;
      const fallbackAnchor =
        (maxDate.value?.isValid() && maxDate.value) ||
        (latestAvailableDate?.isValid() && latestAvailableDate) ||
        moment();
      const anchor =
        (selectedEnd.value.isValid() && selectedEnd.value) ||
        (selectedStart.value.isValid() && selectedStart.value) ||
        fallbackAnchor;
      visibleEndMonth.value = anchor.clone().startOf('month');
    };

    const closePopover = () => {
      isOpen.value = false;
      isMonthPickerOpen.value = false;
      emit('close');
    };

    const openPopover = () => {
      syncDraftFromProps();
      isMonthPickerOpen.value = false;
      isOpen.value = true;
    };

    const togglePopover = () => {
      if (isOpen.value) {
        closePopover();
        return;
      }
      openPopover();
    };

    const toggleMonthPicker = () => {
      isMonthPickerOpen.value = !isMonthPickerOpen.value;
    };

    const navigateWindow = (direction: 'previous' | 'next') => {
      const amount = direction === 'previous' ? -1 : 1;
      if (isMonthPickerOpen.value) {
        if (direction === 'previous' && !canGoPreviousYearWindow.value) return;
        if (direction === 'next' && !canGoNextYearWindow.value) return;
        visibleEndMonth.value = visibleEndMonth.value.clone().add(amount * 12, 'months');
        return;
      }

      if (direction === 'previous' && !canGoPreviousPair.value) return;
      if (direction === 'next' && !canGoNextPair.value) return;
      visibleEndMonth.value = visibleEndMonth.value.clone().add(amount, 'month');
    };

    const selectDate = (value: string) => {
      const parsed = parseDate(value);
      if (!parsed.isValid() || isDisabledDate(parsed)) return;
      const nextSelection = selectDateRangeBoundary(
        {
          start: draftStart.value,
          end: draftEnd.value,
          pickedStartInSession: pickedStartInSession.value,
          pickedEndInSession: pickedEndInSession.value,
        },
        value
      );
      draftStart.value = nextSelection.start;
      draftEnd.value = nextSelection.end;
      pickedStartInSession.value = nextSelection.pickedStartInSession;
      pickedEndInSession.value = nextSelection.pickedEndInSession;
    };

    const jumpToVisibleMonth = (value: string, role: 'start' | 'end') => {
      const parsed = parseDate(value).startOf('month');
      if (!parsed.isValid() || isOutsideMonthBounds(parsed)) return;
      visibleEndMonth.value =
        role === 'start' ? parsed.clone().add(1, 'month') : parsed.clone().startOf('month');
      isMonthPickerOpen.value = false;
    };

    const cancel = () => {
      syncDraftFromProps();
      closePopover();
    };

    const applyRange = () => {
      if (!canApply.value) return;
      emit('select-range', { start: draftStart.value, end: draftEnd.value });
      closePopover();
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!root.value || !target || root.value.contains(target)) return;
      closePopover();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopover();
      }
    };

    watch(
      () => [props.start, props.end],
      () => {
        syncDraftFromProps();
      },
      { immediate: true }
    );

    onMounted(() => {
      document.addEventListener('click', handleDocumentClick);
      document.addEventListener('keydown', handleEscape);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    });

    expose({
      openPopover,
      closePopover,
    });

    return {
      applyRange,
      cancel,
      canApply,
      canNavigateNextWindow,
      canNavigatePreviousWindow,
      draftRangeDisplay,
      endCalendarDays,
      endMonthOptions,
      formattedValue,
      isOpen,
      isMonthPickerOpen,
      jumpToVisibleMonth,
      navigateWindow,
      openPopover,
      root,
      selectDate,
      startMonthOptions,
      startCalendarDays,
      toggleMonthPicker,
      togglePopover,
      visibleWindowLabel,
      visibleEndMonthLabel,
      visibleStartMonthLabel,
    };
  },
});
</script>
