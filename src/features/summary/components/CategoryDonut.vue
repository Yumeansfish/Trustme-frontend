<template>
  <div
    v-if="categoryEntries.length > 0"
    class="flex h-full min-h-0 items-center justify-center overflow-hidden"
  >
    <doughnut
      class="aw-donut-chart"
      :chart-data="chartData"
      :chart-options="chartOptions"
      :plugins="chartPlugins"
    ></doughnut>
  </div>
  <div v-else class="aw-empty-state">No data</div>
</template>

<script lang="ts">
import 'chart.js/auto';
import {
  Tooltip,
  type ActiveElement,
  type Chart,
  type ChartOptions,
  type Plugin,
  type TooltipItem,
} from 'chart.js';
import { Doughnut } from 'vue-chartjs';
import { defineComponent, type PropType } from 'vue';

import type { IEvent } from '~/shared/lib/interfaces';
import {
  ACTIVITY_HOVER,
  ACTIVITY_PRIMARY_BAR,
  ACTIVITY_HIGHLIGHT,
} from '~/shared/lib/visualizationTokens';
import { resolveThemeColor, resolveThemeColorAlpha, THEME_CHANGE_EVENT } from '~/shared/lib/theme';
import {
  CATEGORY_DONUT_CENTER_PRIMARY,
  CATEGORY_DONUT_CENTER_SECONDARY,
  CATEGORY_DONUT_TOOLTIP_BG,
} from '~/features/categorization/lib/visualizationTokens';
import {
  buildCategoryDonutAppEntries,
  buildCategoryDonutCategoryEntries,
  buildCategoryDonutChartData,
  calculateCategoryDonutPercentage,
  formatCategoryDonutDuration,
  groupSmallCategoryDonutEntries,
} from '~/features/summary/lib/categoryDonutState';

type TooltipPosition = { x: number; y: number };
type TooltipPositioner = (_elements: unknown[], eventPosition: TooltipPosition) => TooltipPosition;

const tooltipPositioners = Tooltip.positioners as unknown as Record<string, TooltipPositioner>;

if (!tooltipPositioners.summaryCursorOffset) {
  tooltipPositioners.summaryCursorOffset = function (
    _elements: unknown[],
    eventPosition: TooltipPosition
  ) {
    return {
      x: eventPosition.x + 20,
      y: eventPosition.y + 20,
    };
  };
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

const CENTER_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function fitCenterFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maximum: number,
  minimum: number,
  weight: number
): number {
  for (let size = maximum; size > minimum; size -= 1) {
    ctx.font = `${weight} ${size}px ${CENTER_FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minimum;
}

function truncateCenterText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let shortened = text;
  while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
}

export default defineComponent({
  name: 'CategoryDonut',
  components: { Doughnut },
  props: {
    categoryEvents: {
      type: Array as PropType<IEvent[]>,
      default: () => [],
    },
    appEvents: {
      type: Array as PropType<IEvent[]>,
      default: () => [],
    },
    trackedDuration: {
      type: Number,
      default: 0,
    },
    selectedCategoryLabel: {
      type: String as PropType<string | null>,
      default: null,
    },
    selectedAppLabel: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: ['clear-selection', 'select-category', 'select-app'],
  data() {
    return {
      themeVersion: 0,
      chartOptionsState: null as ChartOptions<'doughnut'> | null,
      centerTextPluginState: null as Plugin<'doughnut'> | null,
      chartPlugins: [] as Plugin<'doughnut'>[],
    };
  },
  created() {
    this.chartOptionsState = this.buildChartOptions();
    this.centerTextPluginState = this.buildCenterTextPlugin();
    this.chartPlugins = [this.centerTextPluginState];
  },
  computed: {
    chartOptions(): ChartOptions<'doughnut'> {
      return this.chartOptionsState || {};
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
    rawCategoryEntries() {
      return buildCategoryDonutCategoryEntries(this.categoryEvents);
    },
    rawAppEntries() {
      return buildCategoryDonutAppEntries(this.appEvents);
    },
    categoryEntries() {
      return groupSmallCategoryDonutEntries(
        this.rawCategoryEntries,
        this.selectedCategoryLabel
      );
    },
    appEntries() {
      return groupSmallCategoryDonutEntries(this.rawAppEntries, this.selectedAppLabel);
    },
    totalDuration() {
      return this.categoryEntries.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
    },
    effectiveTrackedDuration() {
      const duration = Number(this.trackedDuration || 0);
      return duration > 0 ? duration : this.totalDuration;
    },
    chartData() {
      return buildCategoryDonutChartData({
        categoryEntries: this.categoryEntries,
        appEntries: this.appEntries,
        selectedCategoryLabel: this.selectedCategoryLabel,
        selectedAppLabel: this.selectedAppLabel,
        normalColor: this.normalColor,
        activeColor: this.activeColor,
        hoverColor: this.hoverColor,
        dimColor: resolveThemeColorAlpha(
          '--summary-vis-normal',
          0.2,
          hexToRgba(this.normalColor, 0.2)
        ),
        otherColor: resolveThemeColorAlpha(
          '--foreground-subtle',
          0.38,
          'rgba(148, 163, 184, 0.38)'
        ),
        otherHoverColor: resolveThemeColorAlpha(
          '--foreground-subtle',
          0.58,
          'rgba(148, 163, 184, 0.58)'
        ),
      });
    },
  },
  mounted() {
    window.addEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
  },
  beforeUnmount() {
    window.removeEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
  },
  methods: {
    buildChartOptions(): ChartOptions<'doughnut'> {
      return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            position: 'summaryCursorOffset' as unknown as 'average',
            backgroundColor: CATEGORY_DONUT_TOOLTIP_BG,
            displayColors: false,
            titleFont: { size: 0 },
            bodyFont: { size: 12, weight: '600' },
            padding: 10,
            cornerRadius: 8,
            xAlign: 'left',
            yAlign: 'top',
            caretSize: 0,
            caretPadding: 0,
            callbacks: {
              title: () => '',
              label: (ctx: TooltipItem<'doughnut'>) => {
                const seconds = Number(ctx.raw);
                const entries =
                  ctx.datasetIndex === 0
                    ? this.categoryEntries
                    : this.appEntries;
                const entry = entries[ctx.dataIndex];
                const datasetDuration = entries.reduce(
                  (sum, item) => sum + Number(item.duration || 0),
                  0
                );
                const pct = calculateCategoryDonutPercentage(seconds, datasetDuration);
                if (entry?.isOther) {
                  const itemName = ctx.datasetIndex === 0 ? 'categories' : 'applications';
                  return [
                    ` ${pct || '<1'}%: Other`,
                    ` ${entry.groupedCount || 0} ${itemName} below 1%`,
                  ];
                }
                return ` ${pct || '<1'}%: ${entry?.label || ''}`;
              },
            },
          },
        },
        onClick: (_event: unknown, elements: ActiveElement[]) => {
          if (!elements.length) {
            this.$emit('clear-selection');
            return;
          }

          const { datasetIndex, index } = elements[0];
          if (datasetIndex === 0) {
            const category = this.categoryEntries[index];
            if (!category || category.isOther) return;

            if (this.selectedCategoryLabel === category.label) {
              this.$emit('clear-selection');
              return;
            }

            this.$emit('select-category', category.category);
            return;
          }

          const app = this.appEntries[index];
          if (!app || app.isOther) return;

          if (this.selectedAppLabel === app.label) {
            this.$emit('clear-selection');
            return;
          }

          this.$emit('select-app', { app: app.label, category: app.category });
        },
      };
    },
    buildCenterTextPlugin(): Plugin<'doughnut'> {
      return {
        id: 'centerText',
        afterDatasetsDraw: chartInstance => {
          const chart = chartInstance as Chart<'doughnut'>;

          const selectedCategory = this.categoryEntries.find(
            entry => entry.label === this.selectedCategoryLabel
          );
          const selectedApp = this.appEntries.find(entry => entry.label === this.selectedAppLabel);
          const activeEntry = selectedApp || selectedCategory || null;
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const firstArc = chart.getDatasetMeta(0).data[0] as unknown as {
            x?: number;
            y?: number;
            innerRadius?: number;
          };
          const fallbackRadius = Math.min(chartArea.width, chartArea.height) * 0.17;
          const innerRadius = Math.max(24, Number(firstArc?.innerRadius) || fallbackRadius);
          const centerX = Number(firstArc?.x) || (chartArea.left + chartArea.right) / 2;
          const centerY = Number(firstArc?.y) || (chartArea.top + chartArea.bottom) / 2;
          const textWidth = Math.max(32, innerRadius * 2 - 18);
          const primaryTextColor = resolveThemeColor(
            '--foreground-strong',
            CATEGORY_DONUT_CENTER_PRIMARY
          );
          const secondaryTextColor = resolveThemeColor(
            '--foreground-muted',
            CATEGORY_DONUT_CENTER_SECONDARY
          );

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const durationText = formatCategoryDonutDuration(
            activeEntry ? activeEntry.duration : this.effectiveTrackedDuration
          );
          const maximumPrimaryFontSize = Math.max(
            11,
            Math.min(21, Math.floor(innerRadius * 0.42))
          );
          const primaryFontSize = fitCenterFontSize(
            ctx,
            durationText,
            textWidth,
            maximumPrimaryFontSize,
            11,
            700
          );
          ctx.font = `700 ${primaryFontSize}px ${CENTER_FONT_FAMILY}`;
          ctx.fillStyle = primaryTextColor;
          ctx.fillText(durationText, centerX, centerY - (activeEntry ? 7 : 0));

          if (activeEntry) {
            const labelFontSize = fitCenterFontSize(
              ctx,
              activeEntry.label,
              textWidth,
              10,
              8,
              400
            );
            ctx.font = `400 ${labelFontSize}px ${CENTER_FONT_FAMILY}`;
            ctx.fillStyle = secondaryTextColor;
            ctx.fillText(
              truncateCenterText(ctx, activeEntry.label, textWidth),
              centerX,
              centerY + Math.max(11, primaryFontSize * 0.72)
            );
          }

          ctx.restore();
        },
      };
    },
    handleThemeChange() {
      this.themeVersion += 1;
    },
  },
});
</script>
