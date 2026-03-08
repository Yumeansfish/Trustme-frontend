<template>
<div class="aw-chart-height relative w-full" v-if="datasets && datasets.length > 0">
  <bar :chart-data="chartData" :chart-options="chartOptions" :height="330"></bar>
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
import { get_hour_offset } from '~/app/lib/time';
import {
  ACTIVITY_AXIS_COLOR,
  ACTIVITY_GRID_COLOR,
  ACTIVITY_PRIMARY_BAR,
} from '~/features/activity/lib/visualizationTokens';

// Force Chart.js to respect container height globally
Chart.defaults.maintainAspectRatio = false;

function hourToTick(hours: number): string {
  if (hours > 1) {
    return `${hours}h`;
  } else {
    if (hours == 1) {
      return '1h';
    } else if (hours == 0) {
      return '0';
    } else {
      return Math.round(hours * 60) + 'm';
    }
  }
}

import { defineComponent, PropType } from 'vue';

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
    labels() {
      const start = this.timeperiod_start as string;
      const count = this.timeperiod_length[0] as number;
      const resolution = this.timeperiod_length[1] as string;
      if (resolution.startsWith('day') && count == 1) {
        const hourOffset = get_hour_offset();
        return _.range(0, 24).map(h => `${(h + hourOffset) % 24}`);
      } else if (resolution.startsWith('day')) {
        return _.range(count).map(d => `${d + 1}`);
      } else if (resolution.startsWith('week')) {
        // Look up days of the week from `start`
        return _.range(7).map(d => {
          const date = new Date(start);
          date.setDate(date.getDate() + d);
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
      } else if (resolution.startsWith('month')) {
        // FIXME: Needs access to the timeperiod start to know which month
        // How many days are in the given month?
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
      } else if (resolution == 'year') {
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      } else {
        console.error(`Invalid resolution: ${resolution}`);
        return [];
      }
    },
    chartData(): any {
      return {
        labels: this.labels,
        datasets: _.sortBy(this.datasets, d => d.label),
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
        elements: {
          bar: {
            borderWidth: 0,
            borderSkipped: 'bottom',
          },
        },
        plugins: {
          tooltip: {
            mode: 'point',
            intersect: false,
            callbacks: {
              label: function (context) {
                const value = context.parsed.y;
                if (value === null) return '';
                let hours = Math.floor(value);
                let minutes = Math.round((value - hours) * 60);
                if (minutes == 60) {
                  minutes = 0;
                  hours += 1;
                }
                const minutes_str = minutes.toString().padStart(2, '0');
                return `${hours}:${minutes_str}`;
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
            grid: {
              display: false,
              drawOnChartArea: false,
            },
            ticks: {
              display: true,
              color: ACTIVITY_AXIS_COLOR,
              font: {
                size: 11,
              },
            },
          },
          y: {
            stacked: true,
            min: 0,
            suggestedMax: resolution.startsWith('day') ? 1 : undefined,
            grid: {
              color: ACTIVITY_GRID_COLOR,
              drawOnChartArea: true,
            },
            ticks: {
              callback: hourToTick,
              stepSize: resolution.startsWith('day') ? 0.25 : 1,
              color: ACTIVITY_AXIS_COLOR,
            },
          },
        },
      } as any;
    },
  },
});
</script>
