<template>
  <div
    class="aw-chart-height relative flex min-h-0 flex-1 w-full overflow-hidden"
    v-if="visibleDatasets && visibleDatasets.length > 0"
  >
    <bar class="h-full w-full" :chart-data="chartData" :chart-options="chartOptions"></bar>
  </div>
  <div class="aw-empty-state" v-else-if="datasets === null">No data</div>
  <div class="aw-empty-state" v-else>
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
  ACTIVITY_HIGHLIGHT_BORDER,
  ACTIVITY_PRIMARY_BAR,
} from '~/features/activity/lib/visualizationTokens';

Chart.defaults.maintainAspectRatio = false;

function hourToTick(hours: number): string {
  if (hours > 1) return `${hours}h`;
  if (hours === 1) return '1h';
  if (hours === 0) return '0';
  return `${Math.round(hours * 60)}m`;
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
  computed: {
    highlightStore() {
      return useActivityHighlightStore();
    },
    isSingleDay() {
      const [count, resolution] = this.timeperiod_length;
      return resolution.startsWith('day') && count === 1;
    },
    visibleDayWindow() {
      if (!this.isSingleDay || !this.datasets || this.datasets.length === 0) {
        return { start: 0, end: 23 };
      }

      const activeHours: number[] = [];
      this.datasets.forEach(dataset => {
        (dataset.data || []).forEach((value: number | null, index: number) => {
          if (typeof value === 'number' && value > 0) {
            activeHours.push(index);
          }
        });
      });

      if (activeHours.length === 0) {
        return { start: 0, end: 23 };
      }

      const minActive = Math.min(...activeHours);
      const maxActive = Math.max(...activeHours);
      const paddedStart = Math.max(0, minActive - 2);
      const paddedEnd = Math.min(23, maxActive + 2);

      if (paddedEnd - paddedStart >= 20) {
        return { start: 0, end: 23 };
      }

      return { start: paddedStart, end: paddedEnd };
    },
    visibleLabelStep() {
      if (!this.isSingleDay) {
        return 1;
      }

      const labelCount = this.labels.length;
      if (labelCount <= 8) {
        return 1;
      }
      if (labelCount <= 14) {
        return 2;
      }
      return 3;
    },
    labels() {
      const start = this.timeperiod_start as string;
      const count = this.timeperiod_length[0] as number;
      const resolution = this.timeperiod_length[1] as string;

      if (this.isSingleDay) {
        const hourOffset = get_hour_offset();
        return _.range(this.visibleDayWindow.start, this.visibleDayWindow.end + 1).map(
          hour => `${(hour + hourOffset) % 24}`
        );
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
    selectedCategoryLabel() {
      return this.highlightStore.categoryLabel;
    },
    visibleDatasets() {
      if (!this.datasets) return this.datasets;

      return _.sortBy(this.datasets, dataset => dataset.label).map(dataset => {
        const rawData = dataset.data || [];
        const data = this.isSingleDay
          ? rawData.slice(this.visibleDayWindow.start, this.visibleDayWindow.end + 1)
          : rawData;
        const isSelected = this.selectedCategoryLabel === dataset.label;
        const isDimmed = this.selectedCategoryLabel && this.selectedCategoryLabel !== dataset.label;

        return {
          ...dataset,
          data,
          backgroundColor: isSelected
            ? ACTIVITY_HIGHLIGHT
            : isDimmed
            ? hexToRgba(dataset.backgroundColor || ACTIVITY_PRIMARY_BAR, 0.2)
            : dataset.backgroundColor,
          borderColor: isSelected ? ACTIVITY_HIGHLIGHT_BORDER : 'transparent',
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
        labels: this.labels,
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
              title: context => context[0]?.label || '',
              label: context => {
                const value = context.parsed.y;
                if (value === null) return '';
                const pct =
                  this.totalVisibleHours > 0
                    ? Math.round((value / this.totalVisibleHours) * 100)
                    : 0;
                return ` ${pct || '<1'}%: ${context.dataset.label}`;
              },
              afterLabel: context => {
                const value = context.parsed.y;
                return value === null ? '' : hourToTick(value);
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
              color: ACTIVITY_AXIS_COLOR,
              font: {
                size: 10,
              },
              maxRotation: 0,
              minRotation: 0,
              padding: 8,
              callback: (_value, index) => {
                const label = this.labels[index] ?? '';
                if (!this.isSingleDay) {
                  return label;
                }
                return index % this.visibleLabelStep === 0 ? label : '';
              },
            },
          },
          y: {
            stacked: true,
            min: 0,
            suggestedMax: resolution.startsWith('day') ? 1 : undefined,
            grace: resolution.startsWith('day') ? '6%' : '10%',
            border: {
              display: false,
            },
            grid: {
              color: ACTIVITY_GRID_COLOR,
              drawOnChartArea: true,
              drawTicks: false,
            },
            ticks: {
              autoSkip: false,
              callback: hourToTick,
              stepSize: resolution.startsWith('day') ? 0.25 : 1,
              color: ACTIVITY_AXIS_COLOR,
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
});
</script>
