<template>
  <section class="aw-panel aw-checkins-diagram-card p-5 md:p-6" @mouseleave="clearExternalTooltip">
    <div v-if="chartDatasets.length > 0" class="aw-checkins-diagram-shell">
      <line-chart
        class="h-full w-full"
        :chart-data="chartData"
        :chart-options="chartOptions"
      ></line-chart>
    </div>
    <div v-else class="aw-empty-state aw-checkins-diagram-empty">
      No scored check-ins for this day.
    </div>

    <Teleport to="body">
      <div
        v-if="hoveredTooltip"
        ref="tooltipRef"
        class="aw-live-tooltip aw-timeline-hover-card"
        :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
      >
        <div class="aw-timeline-hover-card-top">
          <div class="aw-timeline-hover-card-date">{{ hoveredTooltip.timeLabel }}</div>
          <div class="aw-timeline-hover-card-total">{{ hoveredTooltip.scoreLabel }}</div>
        </div>
        <div class="aw-timeline-hover-card-body">
          <div class="aw-timeline-hover-card-section-title">Check-in</div>
          <div class="space-y-2">
            <div class="aw-timeline-hover-row">
              <div class="aw-timeline-hover-row-pct">{{ hoveredTooltip.scorePercent }}%</div>
              <div class="aw-timeline-hover-row-bar-wrap">
                <div
                  class="aw-timeline-hover-row-bar-fill"
                  :style="{ width: `${hoveredTooltip.scorePercent}%` }"
                ></div>
              </div>
              <div class="aw-timeline-hover-row-name">{{ hoveredTooltip.questionLabel }}</div>
              <div class="aw-timeline-hover-row-duration">{{ hoveredTooltip.scoreLabel }}</div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script lang="ts">
import 'chart.js/auto';
import {
  type ChartData,
  type ChartDataset,
  type ChartOptions,
} from 'chart.js';
import { Line as LineChart } from 'vue-chartjs';
import { defineComponent, nextTick } from 'vue';

import type { CheckinSession } from '~/shared/contracts/checkins.generated';
import {
  buildCheckInDiagramDomain,
  buildCheckInDiagramSeries,
  formatCheckInDiagramHourTick,
} from '~/features/checkins/lib/checkInDiagramState';
import { resolveThemeColor, resolveThemeColorAlpha, THEME_CHANGE_EVENT } from '~/shared/lib/theme';
import {
  ACTIVITY_HIGHLIGHT,
  ACTIVITY_PRIMARY_BAR,
} from '~/features/activity-visualizations/lib/visualizationTokens';

interface CheckInDiagramTooltip {
  questionLabel: string;
  scoreLabel: string;
  scorePercent: number;
  timeLabel: string;
}

interface CheckInTooltipContext {
  tooltip?: {
    opacity: number;
    dataPoints?: Array<{
      dataset?: { label?: string };
      parsed?: { x: number; y: number };
    }>;
    caretX: number;
    caretY: number;
  };
  chart?: {
    canvas?: HTMLCanvasElement;
  };
}

const SERIES_FALLBACKS = ['#9e9ab7', '#5cc0ca', '#6d83b5', '#9cb48f', '#d39d74', '#b68aa4', '#7289a6', '#7aaea5'];

function formatScore(value: number): string {
  return `${Math.round(value)}/5`;
}

function formatScorePercent(value: number): number {
  return Math.round(Math.max(0, Math.min(value, 5)) * 20);
}

function hexToRgba(color: string, alpha: number): string {
  if (!color.startsWith('#')) {
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
  name: 'CheckInDiagram',
  components: {
    LineChart,
  },
  props: {
    sessions: {
      type: Array as () => CheckinSession[],
      default: () => [],
    },
  },
  data() {
    return {
      themeVersion: 0,
      hoveredTooltip: null as CheckInDiagramTooltip | null,
      tooltipX: 0,
      tooltipY: 0,
    };
  },
  computed: {
    chartSeries() {
      return buildCheckInDiagramSeries(this.sessions || []);
    },
    chartDomain() {
      return buildCheckInDiagramDomain(this.sessions || []);
    },
    chartDatasets(): ChartDataset<'line', { x: number; y: number }[]>[] {
      void this.themeVersion;
      const primary = resolveThemeColor('--summary-vis-normal', ACTIVITY_PRIMARY_BAR);
      const highlight = resolveThemeColor('--summary-vis-active', ACTIVITY_HIGHLIGHT);

      return this.chartSeries.map((series, index) => {
        const color = [primary, highlight, ...SERIES_FALLBACKS][index % (SERIES_FALLBACKS.length + 2)];
        return {
          label: series.label,
          data: series.data,
          parsing: false,
          borderColor: color,
          backgroundColor: hexToRgba(color, 0.18),
          pointBackgroundColor: color,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          pointRadius: 4,
          pointHitRadius: 16,
          borderWidth: 2.5,
          tension: 0.32,
          cubicInterpolationMode: 'monotone',
        };
      });
    },
    chartData(): ChartData<'line', { x: number; y: number }[], string> {
      return {
        datasets: this.chartDatasets,
      };
    },
    chartOptions(): ChartOptions<'line'> {
      void this.themeVersion;
      const axisColor = resolveThemeColor('--summary-vis-normal', '#94a3b8');
      const gridColor = resolveThemeColorAlpha('--summary-vis-normal', 0.14, 'rgba(148, 163, 184, 0.14)');

      return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 0,
          },
        },
        animation: {
          duration: 180,
        },
        interaction: {
          mode: 'nearest',
          intersect: false,
        },
        elements: {
          line: {
            fill: false,
          },
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            fullSize: false,
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              boxHeight: 8,
              color: axisColor,
              font: {
                size: 12,
                weight: '600',
              },
              padding: 14,
            },
          },
          tooltip: {
            enabled: false,
            external: context => {
              this.syncExternalTooltip(context as CheckInTooltipContext);
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: this.chartDomain.minX,
            max: this.chartDomain.maxX,
            grid: {
              color: gridColor,
              drawBorder: false,
            },
            ticks: {
              color: axisColor,
              maxTicksLimit: 6,
              callback: value => formatCheckInDiagramHourTick(Number(value)),
            },
          },
          y: {
            min: -0.75,
            max: 5.75,
            ticks: {
              stepSize: 1,
              color: axisColor,
              callback: value => {
                const numeric = Number(value);
                if (numeric < 0 || numeric > 5) {
                  return '';
                }
                return String(numeric);
              },
            },
            grid: {
              color: gridColor,
              drawBorder: false,
            },
          },
        },
      };
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
    syncExternalTooltip(context: CheckInTooltipContext) {
      const tooltip = context?.tooltip;
      const chart = context?.chart;
      const dataPoint = tooltip?.dataPoints?.[0];
      const parsed = dataPoint?.parsed;

      if (!tooltip || !chart || tooltip.opacity === 0 || !parsed) {
        this.clearExternalTooltip();
        return;
      }

      this.hoveredTooltip = {
        questionLabel: dataPoint?.dataset?.label || 'Check-in',
        scoreLabel: formatScore(parsed.y),
        scorePercent: formatScorePercent(parsed.y),
        timeLabel: formatCheckInDiagramHourTick(parsed.x),
      };

      const rect = chart.canvas?.getBoundingClientRect?.();
      if (!rect) {
        return;
      }

      nextTick(() => {
        this.positionExternalTooltip(rect.left + tooltip.caretX, rect.top + tooltip.caretY);
      });
    },
    positionExternalTooltip(clientX: number, clientY: number) {
      const tooltipEl = this.$refs.tooltipRef as HTMLElement | undefined;
      const tooltipWidth = tooltipEl?.offsetWidth ?? 384;
      const tooltipHeight = tooltipEl?.offsetHeight ?? 280;
      const edgeInset = 8;
      const offsetX = 22;
      const offsetY = 18;
      const maxX = Math.max(edgeInset, window.innerWidth - tooltipWidth - edgeInset);
      const maxY = Math.max(edgeInset, window.innerHeight - tooltipHeight - edgeInset);

      let tooltipX = clientX + offsetX;
      if (tooltipX > maxX) {
        tooltipX = clientX - tooltipWidth - offsetX;
      }

      this.tooltipX = Math.max(edgeInset, Math.min(tooltipX, maxX));
      this.tooltipY = Math.max(edgeInset, Math.min(clientY + offsetY, maxY));
    },
    clearExternalTooltip() {
      this.hoveredTooltip = null;
    },
  },
});
</script>
