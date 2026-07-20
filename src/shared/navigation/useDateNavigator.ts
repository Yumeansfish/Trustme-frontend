import moment, { type Moment } from 'moment';
import { computed, nextTick, ref, watch } from 'vue';

import { isDateAvailable, normalizeAvailableDates } from '~/shared/navigation/dateAvailability';
import {
  CALENDAR_DATE_FORMAT,
  buildCalendarDays,
  calendarWeekdays,
  findCalendarKeyboardTarget,
  formatCalendarDate,
  parseCalendarDate,
} from '~/shared/navigation/calendarDate';
import { useDatePopover } from '~/shared/navigation/useDatePopover';

export interface DateNavigatorProps {
  modelValue: string;
  min: string;
  max: string;
  availableDates?: string[] | null;
  disabled: boolean;
  placeholder: string;
}

interface DateNavigatorContext {
  emit: {
    (event: 'update:modelValue', value: string): void;
    (event: 'select', value: string): void;
  };
}

export function useDateNavigator(props: DateNavigatorProps, { emit }: DateNavigatorContext) {
  const isOpen = ref(false);
  const root = ref<HTMLElement | null>(null);
  const trigger = ref<HTMLButtonElement | null>(null);
  const selectedDate = computed(() => parseCalendarDate(props.modelValue));
  const minDate = computed(() => (props.min ? parseCalendarDate(props.min) : null));
  const maxDate = computed(() => (props.max ? parseCalendarDate(props.max) : null));
  const visibleDateAnchor = () => {
    if (selectedDate.value.isValid()) return selectedDate.value;
    return maxDate.value?.isValid() ? maxDate.value : moment();
  };
  const visibleMonth = ref(visibleDateAnchor().clone().startOf('month'));
  const hasSelectedDate = computed(() => selectedDate.value.isValid());
  const formattedValue = computed(() => formatCalendarDate(props.modelValue, props.placeholder));
  const visibleMonthLabel = computed(() => visibleMonth.value.format('MMMM YYYY'));
  const weekdays = computed(calendarWeekdays);

  const isDisabledDate = (date: Moment) => {
    if (minDate.value && date.isBefore(minDate.value, 'day')) return true;
    if (maxDate.value && date.isAfter(maxDate.value, 'day')) return true;
    return !isDateAvailable(date.format(CALENDAR_DATE_FORMAT), props.availableDates);
  };
  const latestSelectableDate = computed(() => {
    if (props.availableDates !== undefined) {
      const latest = normalizeAvailableDates(props.availableDates)
        .reverse()
        .find(value => {
          const parsed = parseCalendarDate(value);
          return parsed.isValid() && !isDisabledDate(parsed);
        });
      return latest ? parseCalendarDate(latest) : null;
    }
    return maxDate.value || moment().startOf('day');
  });
  const calendarDays = computed(() =>
    buildCalendarDays({
      month: visibleMonth.value,
      isDisabled: isDisabledDate,
      selectedDates: hasSelectedDate.value ? [props.modelValue] : [],
    })
  );
  const canGoPreviousMonth = computed(
    () =>
      !minDate.value ||
      visibleMonth.value
        .clone()
        .subtract(1, 'month')
        .endOf('month')
        .isSameOrAfter(minDate.value, 'day')
  );
  const canGoNextMonth = computed(
    () =>
      !maxDate.value ||
      visibleMonth.value
        .clone()
        .add(1, 'month')
        .startOf('month')
        .isSameOrBefore(maxDate.value, 'day')
  );
  const { closePopover } = useDatePopover({ isOpen, root, trigger });

  const togglePopover = () => {
    if (props.disabled) return;
    visibleMonth.value = visibleDateAnchor().clone().startOf('month');
    isOpen.value = !isOpen.value;
  };
  const showPreviousMonth = () => {
    if (canGoPreviousMonth.value) {
      visibleMonth.value = visibleMonth.value.clone().subtract(1, 'month');
    }
  };
  const showNextMonth = () => {
    if (canGoNextMonth.value) visibleMonth.value = visibleMonth.value.clone().add(1, 'month');
  };
  const commitDate = (value: string) => {
    emit('update:modelValue', value);
    emit('select', value);
  };
  const selectDate = (value: string) => {
    const parsed = parseCalendarDate(value);
    if (!parsed.isValid() || isDisabledDate(parsed)) return;
    commitDate(value);
    closePopover(true);
  };
  const jumpToLatest = () => {
    const latest = latestSelectableDate.value;
    if (!latest) return;
    commitDate(latest.format(CALENDAR_DATE_FORMAT));
    visibleMonth.value = latest.clone().startOf('month');
    closePopover(true);
  };
  const clearDate = () => {
    emit('update:modelValue', '');
    closePopover(true);
  };
  const focusDate = async (value: string) => {
    const parsed = parseCalendarDate(value);
    if (!parsed.isValid()) return;
    visibleMonth.value = parsed.clone().startOf('month');
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

  watch(
    () => props.modelValue,
    value => {
      const parsed = parseCalendarDate(value);
      if (parsed.isValid()) visibleMonth.value = parsed.clone().startOf('month');
    }
  );
  watch(isOpen, open => {
    if (!open) return;
    const preferred = hasSelectedDate.value
      ? selectedDate.value.format(CALENDAR_DATE_FORMAT)
      : calendarDays.value.find(day => !day.disabled && day.inMonth)?.iso;
    if (preferred) void focusDate(preferred);
  });
  watch(
    () => props.disabled,
    disabled => {
      if (disabled) closePopover();
    }
  );

  return {
    calendarDays,
    canGoNextMonth,
    canGoPreviousMonth,
    clearDate,
    formattedValue,
    handleDayKeydown,
    hasSelectedDate,
    isOpen,
    jumpToLatest,
    latestSelectableDate,
    root,
    selectDate,
    showNextMonth,
    showPreviousMonth,
    togglePopover,
    trigger,
    visibleMonthLabel,
    weekdays,
  };
}
