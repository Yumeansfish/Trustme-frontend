<template>
  <div ref="root" class="aw-pill-control aw-date-nav">
    <ui-button
      class="aw-icon-button h-7 w-7 rounded-full disabled:opacity-40"
      type="button"
      :disabled="disablePrevious"
      @click="$emit('previous')"
    >
      <icon class="h-3 w-3" name="chevron-left"></icon>
    </ui-button>

    <div class="relative">
      <button
        class="aw-date-nav-trigger"
        type="button"
        :title="formattedValue"
        @click="togglePopover"
      >
        <icon class="h-3.5 w-3.5 shrink-0" name="calendar"></icon>
        <span class="truncate">{{ formattedValue }}</span>
        <icon
          class="h-3.5 w-3.5 shrink-0 transition-transform"
          :class="isOpen ? 'rotate-90' : ''"
          name="chevron-right"
        ></icon>
      </button>

      <div v-if="isOpen" class="aw-date-popover">
        <div class="aw-date-popover-header">
          <button
            class="aw-date-popover-nav"
            type="button"
            :disabled="!canGoPreviousMonth"
            @click="showPreviousMonth"
          >
            <icon class="h-4 w-4" name="chevron-left"></icon>
          </button>
          <div class="aw-date-popover-title">{{ visibleMonthLabel }}</div>
          <button
            class="aw-date-popover-nav"
            type="button"
            :disabled="!canGoNextMonth"
            @click="showNextMonth"
          >
            <icon class="h-4 w-4" name="chevron-right"></icon>
          </button>
        </div>

        <div class="aw-date-weekdays">
          <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
        </div>

        <div class="aw-date-grid">
          <button
            v-for="day in calendarDays"
            :key="day.iso"
            type="button"
            :disabled="day.disabled"
            :class="[
              'aw-date-cell',
              day.inMonth ? '' : 'aw-date-cell-outside',
              day.disabled ? 'aw-date-cell-disabled' : '',
              day.isToday ? 'aw-date-cell-today' : '',
              day.isSelected ? 'aw-date-cell-selected' : '',
            ]"
            @click="selectDate(day.iso)"
          >
            {{ day.label }}
          </button>
        </div>

        <div class="aw-date-popover-footer">
          <button class="aw-date-popover-today" type="button" @click="jumpToLatest">Latest</button>
        </div>
      </div>
    </div>

    <ui-button
      class="aw-icon-button h-7 w-7 rounded-full disabled:opacity-40"
      type="button"
      :disabled="disableNext"
      @click="$emit('next')"
    >
      <icon class="h-3 w-3" name="chevron-right"></icon>
    </ui-button>
  </div>
</template>

<script lang="ts">
import moment from 'moment';
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';

type CalendarDay = {
  iso: string;
  label: string;
  inMonth: boolean;
  disabled: boolean;
  isToday: boolean;
  isSelected: boolean;
};

const DATE_FORMAT = 'YYYY-MM-DD';

function parseDate(value: string) {
  return moment(value, DATE_FORMAT, true);
}

export default defineComponent({
  name: 'DateNavigator',
  props: {
    modelValue: {
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
    disablePrevious: {
      type: Boolean,
      default: false,
    },
    disableNext: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['next', 'previous', 'select', 'update:modelValue'],
  setup(props, { emit }) {
    const isOpen = ref(false);
    const root = ref<HTMLElement | null>(null);
    const selectedDate = computed(() => parseDate(props.modelValue));
    const minDate = computed(() => (props.min ? parseDate(props.min) : null));
    const maxDate = computed(() => (props.max ? parseDate(props.max) : null));
    const visibleMonth = ref(selectedDate.value.clone().startOf('month'));

    const formattedValue = computed(() => selectedDate.value.format('MMM D, YYYY'));
    const visibleMonthLabel = computed(() => visibleMonth.value.format('MMMM YYYY'));

    const firstDayOfWeek = computed(() => moment.localeData().firstDayOfWeek());
    const weekdays = computed(() => {
      const localeWeekdays = moment.weekdaysMin();
      return localeWeekdays
        .slice(firstDayOfWeek.value)
        .concat(localeWeekdays.slice(0, firstDayOfWeek.value));
    });

    const isDisabledDate = (date: moment.Moment) => {
      if (minDate.value && date.isBefore(minDate.value, 'day')) return true;
      if (maxDate.value && date.isAfter(maxDate.value, 'day')) return true;
      return false;
    };

    const calendarDays = computed<CalendarDay[]>(() => {
      const monthStart = visibleMonth.value.clone().startOf('month');
      const offset = (monthStart.day() - firstDayOfWeek.value + 7) % 7;
      const gridStart = monthStart.clone().subtract(offset, 'days');
      const today = moment().startOf('day');

      return Array.from({ length: 42 }, (_, index) => {
        const date = gridStart.clone().add(index, 'days');
        return {
          iso: date.format(DATE_FORMAT),
          label: date.format('D'),
          inMonth: date.month() === visibleMonth.value.month(),
          disabled: isDisabledDate(date),
          isToday: date.isSame(today, 'day'),
          isSelected: date.isSame(selectedDate.value, 'day'),
        };
      });
    });

    const canGoPreviousMonth = computed(() => {
      if (!minDate.value) return true;
      return visibleMonth.value.clone().subtract(1, 'month').endOf('month').isSameOrAfter(minDate.value, 'day');
    });

    const canGoNextMonth = computed(() => {
      if (!maxDate.value) return true;
      return visibleMonth.value.clone().add(1, 'month').startOf('month').isSameOrBefore(maxDate.value, 'day');
    });

    const closePopover = () => {
      isOpen.value = false;
    };

    const togglePopover = () => {
      visibleMonth.value = selectedDate.value.clone().startOf('month');
      isOpen.value = !isOpen.value;
    };

    const showPreviousMonth = () => {
      if (!canGoPreviousMonth.value) return;
      visibleMonth.value = visibleMonth.value.clone().subtract(1, 'month');
    };

    const showNextMonth = () => {
      if (!canGoNextMonth.value) return;
      visibleMonth.value = visibleMonth.value.clone().add(1, 'month');
    };

    const commitDate = (value: string) => {
      emit('update:modelValue', value);
      emit('select', value);
    };

    const selectDate = (value: string) => {
      const parsed = parseDate(value);
      if (!parsed.isValid() || isDisabledDate(parsed)) return;
      commitDate(value);
      closePopover();
    };

    const jumpToLatest = () => {
      const latest = maxDate.value || moment().startOf('day');
      commitDate(latest.format(DATE_FORMAT));
      visibleMonth.value = latest.clone().startOf('month');
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
      () => props.modelValue,
      value => {
        const parsed = parseDate(value);
        if (parsed.isValid()) {
          visibleMonth.value = parsed.clone().startOf('month');
        }
      }
    );

    onMounted(() => {
      document.addEventListener('click', handleDocumentClick);
      document.addEventListener('keydown', handleEscape);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    });

    return {
      calendarDays,
      canGoNextMonth,
      canGoPreviousMonth,
      formattedValue,
      isOpen,
      jumpToLatest,
      root,
      selectDate,
      showNextMonth,
      showPreviousMonth,
      togglePopover,
      visibleMonthLabel,
      weekdays,
    };
  },
});
</script>
