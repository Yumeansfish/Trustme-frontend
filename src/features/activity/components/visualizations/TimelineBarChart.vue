<template>
  <div
    v-if="visibleDatasets && visibleDatasets.length > 0"
    class="aw-chart-height relative flex min-h-0 flex-1 w-full overflow-hidden"
  >
    <bar class="h-full w-full" :chart-data="chartData" :chart-options="chartOptions"></bar>
  </div>
  <div v-else-if="datasets === null" class="aw-empty-state">No data</div>
  <div v-else class="aw-empty-state">
    <div class="aw-loading">Loading...</div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Chart, ChartOptions } from 'chart.js';
import 'chart.js/auto';
import { Bar } from 'vue-chartjs';
import { defineComponent, PropType } from 'vue';

import { get_hour_offset } from '~/app/lib/time';
import { useActivityHighlightStore } from '~/features/activity/store/highlight';
import {
  ACTIVITY_AXIS_COLOR,
  ACTIVITY_GRID_COLOR,
  ACTIVITY_HIGHLIGHT,
  ACTIVITY_HOVER,
  ACTIVITY_PRIMARY_BAR,
} from '~/features/activity/lib/visualizationTokens';
import { resolveThemeColor, resolveThemeColorAlpha, THEME_CHANGE_EVENT } from '~/shared/lib/theme';

Chart.defaults.maintainAspectRatio = false;

function hourToTick(hours: number): string {
  const totalMinutes = Math.round(hours * 60);

  if (totalMinutes >= 60) {
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
      return `${wholeHours}h`;
    }

    return `${wholeHours}h ${minutes}m`;
  }

  if (hours === 0) return '0';
  return `${totalMinutes}m`;
}

function hexToRgba(color: string, alpha: number): string {
  if (!color || !color.startsWith('#')) {
    return color;
  }

  const normalized = color.replace('#', '');
  const hex =
    normalized.length === 3
      ? normalized
          .split('')
          .map(char => char + char)
          .join('')
      : normalized;

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export default defineComponent({
  name: 'TimelineBarChart',
  components: { Bar },
  props: {
    datasets: {
      type: Array as PropType<any[]>,
      default: () => [
        {
          label: 'Total time',
          backgroundColor: ACTIVITY_PRIMARY_BAR,
          data: Array.from({ length: 40 }, () => Math.floor(Math.random() * 40)),
        },
      ],
    },
    timeperiod_start: {
      type: String,
      default: () => null,
    },
    timeperiod_length: {
      type: Array as PropType<[number, string]>,
      default: () => [1, 'day'],
    },
  },
  data() {
    return {
      themeVersion: 0,
    };
  },
  computed: {
    highlightStore() {
      return useActivityHighlightStore();
    },
    normalColor() {
      void this.themeVersion;
      return resolveThemeColor('--summary-vis-normal', ACTIVITY_PRIMARY_BAR);
    },
    activeColor() {
      void this.themeVersion;
      return resolveThemeColor('--summary-vis-active', ACTIVITY_HIGHLIGHT);
    },
    hoverColor() {
      void this.themeVersion;
      return resolveThemeColor('--summary-vis-hover', ACTIVITY_HOVER);
    },
    axisColor() {
      void this.themeVersion;
      return resolveThemeColor('--summary-vis-normal', ACTIVITY_AXIS_COLOR);
    },
    gridColor() {
      void this.themeVersion;
      return resolveThemeColorAlpha('--summary-vis-normal', 0.18, ACTIVITY_GRID_COLOR);
    },
    isSingleDay() {
      const [count, resolution] = this.timeperiod_length;
      return resolution.startsWith('day') && count === 1;
    },
    labels() {
      const start = this.timeperiod_start as string;
      const count = this.timeperiod_length[0] as number;
      const resolution = this.timeperiod_length[1] as string;

      if (this.isSingleDay) {
        const hourOffset = get_hour_offset();
        return _.range(24).map(hour => `${(hour + hourOffset) % 24}`);
      }

      if (resolution.startsWith('day')) {
        return _.range(count).map(d => `${d + 1}`);
      }

      if (resolution.startsWith('week')) {
        return _.range(7).map(d => {
          const date = new Date(start);
          date.setDate(date.getDate() + d);
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
      }

      if (resolution.startsWith('month')) {
        const date = new Date(start);
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const ordinalsEnUS = {
          one: 'st',
          two: 'nd',
          few: 'rd',
          many: 'th',
          zero: 'th',
          other: 'th',
        };
        const toOrdinalSuffix = (num: number, locale = 'en-US', ordinals = ordinalsEnUS) => {
          const pluralRules = new Intl.PluralRules(locale, { type: 'ordinal' });
          return `${num}${ordinals[pluralRules.select(num)]}`;
        };
        return _.range(1, daysInMonth + 1).map(d => toOrdinalSuffix(d));
      }

      if (resolution === 'year') {
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      }

      console.error(`Invalid resolution: ${resolution}`);
      return [];
    },
    visibleHourWindow() {
      if (!this.isSingleDay || !this.datasets || this.labels.length === 0) {
        return {
          start: 0,
          end: Math.max(this.labels.length - 1, 0),
        };
      }

      const activeIndexes = this.labels
        .map((_, index) => index)
        .filter(index =>
          (this.datasets || []).some(dataset => {
            const value = dataset.data?.[index];
            return typeof value === 'number' && value > 0;
          })
        );

      if (activeIndexes.length === 0) {
        return {
          start: 0,
          end: Math.max(this.labels.length - 1, 0),
        };
      }

      return {
        start: Math.max(0, activeIndexes[0] - 2),
        end: Math.min(this.labels.length - 1, activeIndexes[activeIndexes.length - 1] + 2),
      };
    },
    visibleLabels() {
      const { start, end } = this.visibleHourWindow;
      return this.labels.slice(start, end + 1);
    },
    selectedCategoryLabel() {
      return this.highlightStore.categoryLabel;
    },
    visibleDatasets() {
      if (!this.datasets) return this.datasets;

      const { start, end } = this.visibleHourWindow;

      return _.sortBy(this.datasets, dataset => dataset.label).map(dataset => {
        const isSelected = this.selectedCategoryLabel === dataset.label;
        const isDimmed = this.selectedCategoryLabel && this.selectedCategoryLabel !== dataset.label;

        return {
          ...dataset,
          data: (dataset.data || []).slice(start, end + 1),
          backgroundColor: isSelected
            ? this.activeColor
            : isDimmed
            ? hexToRgba(this.normalColor, 0.2)
            : this.normalColor,
          hoverBackgroundColor: isSelected ? this.activeColor : this.hoverColor,
          borderColor: isSelected ? this.activeColor : 'transparent',
          hoverBorderColor: isSelected ? this.activeColor : 'transparent',
          borderWidth: isSelected ? 3 : 0,
        };
      });
    },
    totalVisibleHours() {
      return (this.visibleDatasets || []).reduce((sum, dataset) => {
        return (
          sum +
          (dataset.data || []).reduce((datasetSum: number, value: number | null) => {
            return datasetSum + (typeof value === 'number' ? value : 0);
          }, 0)
        );
      }, 0);
    },
    chartData(): any {
      return {
        labels: this.visibleLabels,
        datasets: this.visibleDatasets,
        title: {
          display: true,
          text: 'Timeline',
        },
      };
    },
    chartOptions(): ChartOptions<'bar'> {
      const resolution = this.timeperiod_length[1] as string;

      return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            right: 12,
            bottom: 8,
            left: 4,
          },
        },
        interaction: {
          mode: 'nearest',
          intersect: false,
        },
        elements: {
          bar: {
            borderSkipped: 'bottom',
            borderRadius: 6,
          },
        },
        onClick: (_event: unknown, elements: any[]) => {
          if (!elements.length) {
            this.highlightStore.clear();
            return;
          }

          const { datasetIndex } = elements[0];
          const dataset = this.visibleDatasets?.[datasetIndex];
          if (!dataset?.label) return;

          if (this.selectedCategoryLabel === dataset.label) {
            this.highlightStore.clear();
            return;
          }

          this.highlightStore.setCategory(dataset.label.split(' > '));
        },
        plugins: {
          tooltip: {
            mode: 'point',
            intersect: false,
            displayColors: false,
            padding: 10,
            callbacks: {
              title: () => '',
              label: context => {
                const value = context.parsed.y;
                if (value === null) return '';
                const pct =
                  this.totalVisibleHours > 0
                    ? Math.round((value / this.totalVisibleHours) * 100)
                    : 0;
                return `${pct || '<1'}%: ${context.dataset.label}`;
              },
            },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            display: true,
            stacked: true,
            border: {
              display: false,
            },
            grid: {
              display: false,
              drawOnChartArea: false,
              drawTicks: false,
            },
            ticks: {
              display: true,
              autoSkip: false,
              color: this.axisColor,
              font: {
                size: this.isSingleDay ? 9 : 10,
              },
              maxRotation: 0,
              minRotation: 0,
              padding: 8,
              callback: (_value, index) => this.visibleLabels[index] ?? '',
            },
          },
          y: {
            stacked: true,
            min: 0,
            max: resolution.startsWith('day') ? 1 : undefined,
            grace: resolution.startsWith('day') ? 0 : '10%',
            border: {
              display: false,
            },
            grid: {
              color: this.gridColor,
              drawOnChartArea: true,
              drawTicks: false,
            },
            ticks: {
              autoSkip: false,
              callback: hourToTick,
              stepSize: resolution.startsWith('day') ? 0.25 : 1,
              color: this.axisColor,
              font: {
                size: 10,
              },
              maxTicksLimit: resolution.startsWith('day') ? 5 : 6,
              padding: 8,
            },
          },
        },
      } as any;
    },
  },
  mounted() {
    window.addEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
  },
  beforeUnmount() {
    window.removeEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
  },
  methods: {
    handleThemeChange() {
      this.themeVersion += 1;
    },
  },
});
</script>
