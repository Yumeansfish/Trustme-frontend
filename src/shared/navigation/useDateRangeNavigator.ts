import moment, { type Moment } from 'moment';
import { computed, nextTick, ref, watch } from 'vue';

import {
  CALENDAR_DATE_FORMAT,
  buildCalendarDays,
  buildCalendarMonthOptions,
  findCalendarKeyboardTarget,
  formatCalendarDate,
  isCalendarMonthOutsideBounds,
  parseCalendarDate,
} from '~/shared/navigation/calendarDate';
import { selectDateRangeBoundary } from '~/shared/navigation/dateRangeSelection';
import { useDatePopover } from '~/shared/navigation/useDatePopover';

export interface DateRangeNavigatorProps {
  start: string;
  end: string;
  min: string;
  max: string;
  availableDates?: string[] | null;
}

interface DateRangeNavigatorContext {
  emit: {
    (event: 'close'): void;
    (event: 'select-range', value: { start: string; end: string }): void;
  };
  expose: (exposed: Record<string, unknown>) => void;
}

function formatRangeLabel(start: string, end: string): string {
  const startDate = parseCalendarDate(start);
  const endDate = parseCalendarDate(end);
  if (!startDate.isValid() || !endDate.isValid()) return 'Select range';
  if (startDate.isSame(endDate, 'day')) return startDate.format('MMM D, YYYY');
  return `${startDate.format('MMM D, YYYY')} - ${endDate.format('MMM D, YYYY')}`;
}

export function useDateRangeNavigator(
  props: DateRangeNavigatorProps,
  { emit, expose }: DateRangeNavigatorContext
) {
  const isOpen = ref(false);
  const isMonthPickerOpen = ref(false);
  const root = ref<HTMLElement | null>(null);
  const trigger = ref<HTMLButtonElement | null>(null);
  const draftStart = ref(props.start);
  const draftEnd = ref(props.end);
  const pickedStartInSession = ref(false);
  const pickedEndInSession = ref(false);
  const visibleEndMonth = ref(moment().startOf('month'));

  const selectedStart = computed(() => parseCalendarDate(props.start));
  const selectedEnd = computed(() => parseCalendarDate(props.end));
  const minDate = computed(() => (props.min ? parseCalendarDate(props.min) : null));
  const maxDate = computed(() => (props.max ? parseCalendarDate(props.max) : null));
  const availableDateSet = computed(() => new Set(props.availableDates || []));
  const availableMonthSet = computed(
    () => new Set((props.availableDates || []).map(value => value.slice(0, 7)))
  );
  const visibleStartMonth = computed(() => visibleEndMonth.value.clone().subtract(1, 'month'));
  const visibleStartMonthLabel = computed(() => visibleStartMonth.value.format('MMMM YYYY'));
  const visibleEndMonthLabel = computed(() => visibleEndMonth.value.format('MMMM YYYY'));
  const visibleWindowLabel = computed(
    () => `${visibleStartMonthLabel.value} - ${visibleEndMonthLabel.value}`
  );
  const formattedValue = computed(() => formatRangeLabel(props.start, props.end));
  const draftStartDate = computed(() => parseCalendarDate(draftStart.value));
  const draftEndDate = computed(() => parseCalendarDate(draftEnd.value));
  const draftRangeDisplay = computed(() => {
    const hasDraftStart =
      draftStartDate.value.isValid() &&
      (pickedStartInSession.value || draftStart.value === props.start);
    const hasDraftEnd =
      draftEndDate.value.isValid() && (pickedEndInSession.value || draftEnd.value === props.end);
    const startLabel = hasDraftStart ? formatCalendarDate(draftStart.value) : '';
    const endLabel = hasDraftEnd ? formatCalendarDate(draftEnd.value) : '';
    return startLabel && endLabel ? `${startLabel} - ${endLabel}` : startLabel || endLabel;
  });

  const isDisabledDate = (date: Moment) => {
    if (minDate.value && date.isBefore(minDate.value, 'day')) return true;
    if (maxDate.value && date.isAfter(maxDate.value, 'day')) return true;
    return Boolean(
      availableDateSet.value.size > 0 &&
        !availableDateSet.value.has(date.format(CALENDAR_DATE_FORMAT))
    );
  };
  const isOutsideMonthBounds = (month: Moment) =>
    isCalendarMonthOutsideBounds(month, {
      minDate: minDate.value,
      maxDate: maxDate.value,
    });
  const hasAvailableMonthInYear = (year: Moment) => {
    const yearStart = year.clone().startOf('year');
    return Array.from({ length: 12 }, (_, index) =>
      yearStart.clone().month(index).startOf('month')
    ).some(
      month =>
        !isOutsideMonthBounds(month) &&
        (availableMonthSet.value.size === 0 ||
          availableMonthSet.value.has(month.format('YYYY-MM')))
    );
  };

  const calendarDaysForMonth = (month: Moment) =>
    buildCalendarDays({
      month,
      includeAdjacentDays: false,
      isDisabled: isDisabledDate,
      selectedDates: [draftStart.value, draftEnd.value],
      rangeStart: draftStartDate.value,
      rangeEnd: draftEndDate.value,
    });
  const startCalendarDays = computed(() => calendarDaysForMonth(visibleStartMonth.value));
  const endCalendarDays = computed(() => calendarDaysForMonth(visibleEndMonth.value));
  const startMonthOptions = computed(() =>
    buildCalendarMonthOptions({
      year: visibleStartMonth.value.clone().startOf('year'),
      role: 'start',
      selectedMonth: visibleStartMonth.value,
      bounds: { minDate: minDate.value, maxDate: maxDate.value },
    })
  );
  const endMonthOptions = computed(() =>
    buildCalendarMonthOptions({
      year: visibleEndMonth.value.clone().startOf('year'),
      role: 'end',
      selectedMonth: visibleEndMonth.value,
      bounds: { minDate: minDate.value, maxDate: maxDate.value },
    })
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
  const canGoPreviousYearWindow = computed(
    () =>
      hasAvailableMonthInYear(visibleStartMonth.value.clone().subtract(12, 'months')) ||
      hasAvailableMonthInYear(visibleEndMonth.value.clone().subtract(12, 'months'))
  );
  const canGoNextYearWindow = computed(
    () =>
      hasAvailableMonthInYear(visibleStartMonth.value.clone().add(12, 'months')) ||
      hasAvailableMonthInYear(visibleEndMonth.value.clone().add(12, 'months'))
  );
  const canNavigatePreviousWindow = computed(() =>
    isMonthPickerOpen.value ? canGoPreviousYearWindow.value : canGoPreviousPair.value
  );
  const canNavigateNextWindow = computed(() =>
    isMonthPickerOpen.value ? canGoNextYearWindow.value : canGoNextPair.value
  );
  const canApply = computed(
    () =>
      pickedStartInSession.value &&
      pickedEndInSession.value &&
      draftStartDate.value.isValid() &&
      draftEndDate.value.isValid() &&
      !draftEndDate.value.isBefore(draftStartDate.value, 'day') &&
      !isDisabledDate(draftStartDate.value) &&
      !isDisabledDate(draftEndDate.value)
  );

  const syncDraftFromProps = () => {
    draftStart.value = props.start;
    draftEnd.value = props.end;
    pickedStartInSession.value = false;
    pickedEndInSession.value = false;
    const latestAvailableValue = props.availableDates?.at(-1);
    const latestAvailableDate = latestAvailableValue
      ? parseCalendarDate(latestAvailableValue)
      : null;
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

  const { closePopover: closeBasePopover } = useDatePopover({
    isOpen,
    root,
    trigger,
    onClose: () => {
      isMonthPickerOpen.value = false;
      emit('close');
    },
  });
  const closePopover = (restoreFocus = false) => {
    isMonthPickerOpen.value = false;
    closeBasePopover(restoreFocus);
  };
  const openPopover = () => {
    syncDraftFromProps();
    isMonthPickerOpen.value = false;
    isOpen.value = true;
  };
  const togglePopover = () => (isOpen.value ? closePopover() : openPopover());
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
    const parsed = parseCalendarDate(value);
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
  const focusDate = async (value: string) => {
    const parsed = parseCalendarDate(value);
    if (!parsed.isValid()) return;
    if (parsed.isBefore(visibleStartMonth.value, 'month')) {
      visibleEndMonth.value = parsed.clone().add(1, 'month').startOf('month');
    } else if (parsed.isAfter(visibleEndMonth.value, 'month')) {
      visibleEndMonth.value = parsed.clone().startOf('month');
    }
    await nextTick();
    root.value?.querySelector<HTMLButtonElement>(`[data-date="${value}"]`)?.focus();
  };
  const handleDayKeydown = (event: KeyboardEvent, value: string) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const target = findCalendarKeyboardTarget({
      value,
      key: event.key,
      minDate: minDate.value,
      maxDate: maxDate.value,
      isDisabled: isDisabledDate,
    });
    if (target) void focusDate(target);
  };
  const jumpToVisibleMonth = (value: string, role: 'start' | 'end') => {
    const parsed = parseCalendarDate(value).startOf('month');
    if (!parsed.isValid() || isOutsideMonthBounds(parsed)) return;
    visibleEndMonth.value =
      role === 'start' ? parsed.clone().add(1, 'month') : parsed.clone().startOf('month');
    isMonthPickerOpen.value = false;
  };
  const cancel = () => {
    syncDraftFromProps();
    closePopover(true);
  };
  const applyRange = () => {
    if (!canApply.value) return;
    emit('select-range', { start: draftStart.value, end: draftEnd.value });
    closePopover(true);
  };

  watch(() => [props.start, props.end], syncDraftFromProps, { immediate: true });
  watch(isOpen, open => {
    if (!open) return;
    const preferred =
      [draftStart.value, draftEnd.value].find(value => {
        const parsed = parseCalendarDate(value);
        return parsed.isValid() && !isDisabledDate(parsed);
      }) || startCalendarDays.value.find(day => !day.disabled)?.iso;
    if (preferred) void focusDate(preferred);
  });
  expose({ openPopover, closePopover });

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
    handleDayKeydown,
    isOpen,
    isMonthPickerOpen,
    jumpToVisibleMonth,
    navigateWindow,
    openPopover,
    root,
    trigger,
    selectDate,
    startMonthOptions,
    startCalendarDays,
    toggleMonthPicker,
    togglePopover,
    visibleWindowLabel,
  };
}
