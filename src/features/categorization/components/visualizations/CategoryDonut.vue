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
import { defineComponent } from 'vue';

import { useActivityStore } from '~/features/activity-dashboard/store/activity';
import { useActivityHighlightStore } from '~/features/activity-dashboard/store/highlight';
import {
  ACTIVITY_HOVER,
  ACTIVITY_PRIMARY_BAR,
  ACTIVITY_HIGHLIGHT,
} from '~/features/activity-visualizations/lib/visualizationTokens';
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
} from '~/features/categorization/lib/categoryDonutState';

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

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0m';
  }
  const hrs = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
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
  name: 'CategoryDonut',
  components: { Doughnut },
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
    chartOptions(): any {
      return this.chartOptionsState;
    },
    activityStore() {
      return useActivityStore();
    },
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
    categoryEntries() {
      return buildCategoryDonutCategoryEntries(this.activityStore.category?.top || []);
    },
    appEntries() {
      return buildCategoryDonutAppEntries(this.activityStore.window?.top_apps || []);
    },
    totalDuration() {
      return this.categoryEntries.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
    },
    totalTrackedDuration() {
      const duration = Number(this.activityStore.active?.duration || 0);
      return duration > 0 ? duration : this.totalDuration;
    },
    selectedCategoryLabel() {
      return this.highlightStore.categoryLabel;
    },
    selectedAppLabel() {
      return this.highlightStore.app;
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
            position: 'summaryCursorOffset' as any,
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
                const seconds = Number(ctx.raw) * 3600;
                const pct =
                  this.totalTrackedDuration > 0
                    ? Math.round((seconds / this.totalTrackedDuration) * 100)
                    : 0;
                const label =
                  ctx.datasetIndex === 0
                    ? this.categoryEntries[ctx.dataIndex]?.label
                    : this.appEntries[ctx.dataIndex]?.label;
                return ` ${pct || '<1'}%: ${label}`;
              },
            },
          },
        },
        onClick: (_event: unknown, elements: ActiveElement[]) => {
          if (!elements.length) {
            this.highlightStore.clear();
            return;
          }

          const { datasetIndex, index } = elements[0];
          if (datasetIndex === 0) {
            const category = this.categoryEntries[index];
            if (!category) return;

            if (this.selectedCategoryLabel === category.label) {
              this.highlightStore.clear();
              return;
            }

            this.highlightStore.setCategory(category.category);
            return;
          }

          const app = this.appEntries[index];
          if (!app) return;

          if (this.selectedAppLabel === app.label) {
            this.highlightStore.clear();
            return;
          }

          this.highlightStore.setApp({ app: app.label, category: app.category });
        },
      };
    },
    buildCenterTextPlugin(): Plugin<'doughnut'> {
      return {
        id: 'centerText',
        afterDraw: chartInstance => {
          const chart = chartInstance as Chart<'doughnut'>;
          const selectedCategory = this.categoryEntries.find(
            entry => entry.label === this.selectedCategoryLabel
          );
          const selectedApp = this.appEntries.find(entry => entry.label === this.selectedAppLabel);
          const activeEntry = selectedApp || selectedCategory || null;
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const centerX = (chartArea.left + chartArea.right) / 2;
          const centerY = (chartArea.top + chartArea.bottom) / 2;
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

          ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = primaryTextColor;
          ctx.fillText(
            formatDuration(activeEntry ? activeEntry.duration : this.totalTrackedDuration),
            centerX,
            centerY - 2
          );

          if (activeEntry) {
            ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = secondaryTextColor;
            ctx.fillText(activeEntry.label, centerX, centerY + 18);
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
