<template>
  <div
    v-if="visibleDataset.length > 0"
    class="aw-chart-height relative flex min-h-0 flex-1 w-full overflow-hidden"
    @mouseleave="clearExternalTooltip"
  >
    <bar
      ref="chartRef"
      class="h-full w-full"
      :chart-data="chartData"
      :chart-options="chartOptions"
      :plugins="chartPlugins"
    ></bar>

    <Teleport to="body">
      <div
        v-if="hoveredPreview"
        ref="tooltipRef"
        class="aw-live-tooltip aw-timeline-hover-card"
        :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
      >
        <div class="aw-timeline-hover-card-top">
          <div class="aw-timeline-hover-card-date">{{ hoveredPreview.dateLabel }}</div>
          <div class="aw-timeline-hover-card-total">{{ hoveredPreview.totalDurationLabel }}</div>
        </div>
        <div class="aw-timeline-hover-card-body">
          <div class="aw-timeline-hover-card-section-title">Categories</div>
          <div v-if="hoveredTooltipLoading" class="aw-timeline-hover-card-empty">Loading...</div>
          <div v-else-if="hoveredStack && hoveredStack.rows.length > 0" class="space-y-2">
            <div v-for="row in hoveredStack.rows" :key="row.label" class="aw-timeline-hover-row">
              <div class="aw-timeline-hover-row-pct">{{ row.percent }}%</div>
              <div class="aw-timeline-hover-row-bar-wrap">
                <div
                  class="aw-timeline-hover-row-bar-fill"
                  :style="{ width: `${row.percent}%` }"
                ></div>
              </div>
              <div class="aw-timeline-hover-row-name">{{ row.label }}</div>
              <div class="aw-timeline-hover-row-duration">{{ row.durationLabel }}</div>
            </div>
          </div>
          <div v-else class="aw-timeline-hover-card-empty">No tracked activity.</div>
        </div>
      </div>
    </Teleport>
  </div>
  <div v-else-if="datasets === null" class="aw-empty-state">No data</div>
  <div v-else class="aw-empty-state">
    <div class="aw-loading">Loading...</div>
  </div>
</template>

<script lang="ts">
import { Chart, ChartOptions, Plugin } from 'chart.js';
import 'chart.js/auto';
import { Bar } from 'vue-chartjs';
import { defineComponent, nextTick, PropType } from 'vue';

import {
  buildTimelineBarBuckets,
  buildTimelineBarAxisLabels,
  buildTimelineBarChartData,
  buildTimelineBarLabels,
  buildTimelineBarSelectionOverlay,
  buildTimelineBarTooltipPreview,
  buildTimelineBarTooltipSummary,
  buildTimelineBarVisibleBuckets,
  buildTimelineBarVisibleDataset,
  formatTimelineBarHourTick,
  isTimelineBarSingleDay,
  resolveTimelineBarVisibleHourWindow,
} from '~/features/activity-visualizations/lib/timelineBarChartState';
import type { TimelineBarDataset } from '~/features/activity-visualizations/lib/timelineBarChartState';
import type {
  ActivityPeriodMode,
  CategoryPeriodData,
} from '~/features/activity-dashboard/store/activityTypes';
import { useActivityHighlightStore } from '~/features/activity-dashboard/store/highlight';
import {
  ACTIVITY_AXIS_COLOR,
  ACTIVITY_GRID_COLOR,
  ACTIVITY_HIGHLIGHT,
  ACTIVITY_HOVER,
  ACTIVITY_PRIMARY_BAR,
} from '~/features/activity-visualizations/lib/visualizationTokens';
import { resolveThemeColor, resolveThemeColorAlpha, THEME_CHANGE_EVENT } from '~/shared/lib/theme';

Chart.defaults.maintainAspectRatio = false;

interface TimelineSelectionPluginOptions {
  ratios?: number[];
  color?: string;
}

interface TimelineBarElement {
  getProps(
    keys: string[],
    final?: boolean
  ): {
    x: number;
    y: number;
    base: number;
    width: number;
  };
}

interface TimelineTooltipContext {
  tooltip?: {
    opacity: number;
    dataPoints?: Array<{ dataIndex: number }>;
    caretX: number;
    caretY: number;
  };
  chart?: {
    canvas?: HTMLCanvasElement;
  };
}

interface MutableTimelineScale {
  ticks: {
    color?: string;
    font: { size?: number };
    stepSize?: number;
    maxTicksLimit?: number;
  };
  grid: {
    color?: string;
  };
  max?: number;
  grace?: number | string;
}

type TimelineChartOptionsState = ChartOptions<'bar'> & {
  scales: {
    x: MutableTimelineScale;
    y: MutableTimelineScale;
  };
  plugins: {
    timelineSelectionOverlay: TimelineSelectionPluginOptions;
  } & Record<string, unknown>;
};

const timelineSelectionOverlayPlugin: Plugin<'bar'> = {
  id: 'timelineSelectionOverlay',
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const options = pluginOptions as TimelineSelectionPluginOptions;
    const ratios = Array.isArray(options.ratios) ? options.ratios : [];
    const color = typeof options.color === 'string' ? options.color : '';

    if (!color || ratios.length === 0 || !ratios.some((ratio: number) => ratio > 0)) {
      return;
    }

    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) {
      return;
    }

    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = color;

    meta.data.forEach((element, index: number) => {
      const ratio = ratios[index];
      if (!ratio || ratio <= 0) {
        return;
      }

      const props = (element as unknown as TimelineBarElement).getProps(
        ['x', 'y', 'base', 'width'],
        true
      );
      const totalHeight = props.base - props.y;
      if (!Number.isFinite(totalHeight) || totalHeight <= 0) {
        return;
      }

      const overlayHeight = totalHeight * Math.max(0, Math.min(1, ratio));
      if (overlayHeight <= 0) {
        return;
      }

      ctx.fillRect(
        props.x - props.width / 2,
        props.base - overlayHeight,
        props.width,
        overlayHeight
      );
    });

    ctx.restore();
  },
};

export default defineComponent({
  name: 'TimelineBarChart',
  components: { Bar },
  props: {
    datasets: {
      type: Object as PropType<CategoryPeriodData | null>,
      default: null,
    },
    timeperiod_start: {
      type: String,
      default: () => null,
    },
    timeperiod_length: {
      type: Array as unknown as PropType<[number, string]>,
      default: () => [1, 'day'],
    },
    timeperiod_mode: {
      type: String as PropType<ActivityPeriodMode>,
      default: 'day',
    },
  },
  data() {
    return {
      themeVersion: 0,
      chartDataState: {
        labels: [] as string[],
        datasets: [] as TimelineBarDataset[],
        title: {
          display: true,
          text: 'Timeline',
        },
      },
      chartOptionsState: null as TimelineChartOptionsState | null,
      hoveredPreview: null as ReturnType<typeof buildTimelineBarTooltipPreview> | null,
      hoveredStack: null as ReturnType<typeof buildTimelineBarTooltipSummary> | null,
      hoveredTooltipLoading: false,
      hoveredDataIndex: -1,
      hoveredTooltipNonce: 0,
      tooltipX: 0,
      tooltipY: 0,
      chartPlugins: [timelineSelectionOverlayPlugin] as Plugin<'bar'>[],
    };
  },
  created() {
    this.chartOptionsState = this.buildChartOptions();
    this.syncChartData();
    this.syncChartOptions();
  },
  computed: {
    chartData(): any {
      return this.chartDataState;
    },
    chartOptions(): any {
      return this.chartOptionsState;
    },
    highlightStore() {
      return useActivityHighlightStore();
    },
    themePalette() {
      return {
        version: this.themeVersion,
        normal: resolveThemeColor('--summary-vis-normal', ACTIVITY_PRIMARY_BAR),
        active: resolveThemeColor('--summary-vis-active', ACTIVITY_HIGHLIGHT),
        hover: resolveThemeColor('--summary-vis-hover', ACTIVITY_HOVER),
        axis: resolveThemeColor('--summary-vis-normal', ACTIVITY_AXIS_COLOR),
        grid: resolveThemeColorAlpha('--summary-vis-normal', 0.18, ACTIVITY_GRID_COLOR),
      };
    },
    isSingleDay() {
      return isTimelineBarSingleDay(
        this.timeperiod_length as [number, string],
        this.timeperiod_mode as ActivityPeriodMode
      );
    },
    labels() {
      return buildTimelineBarLabels({
        start: this.timeperiod_start as string,
        timeperiodLength: this.timeperiod_length as [number, string],
        isSingleDay: this.isSingleDay,
        hourOffset: 0,
        periodMode: this.timeperiod_mode as ActivityPeriodMode | null,
      });
    },
    timelineBuckets() {
      return buildTimelineBarBuckets(this.datasets as CategoryPeriodData | null);
    },
    visibleHourWindow() {
      return resolveTimelineBarVisibleHourWindow({
        buckets: this.timelineBuckets,
        labelsLength: this.labels.length,
        isSingleDay: this.isSingleDay,
      });
    },
    visibleLabels() {
      const { start, end } = this.visibleHourWindow;
      return this.labels.slice(start, end + 1);
    },
    axisLabels() {
      return buildTimelineBarAxisLabels({
        labels: this.labels,
        start: this.timeperiod_start as string,
        timeperiodLength: this.timeperiod_length as [number, string],
        periodMode: this.timeperiod_mode as ActivityPeriodMode | null,
        isSingleDay: this.isSingleDay,
      });
    },
    visibleAxisLabels() {
      const { start, end } = this.visibleHourWindow;
      return this.axisLabels.slice(start, end + 1);
    },
    selectedCategoryLabel() {
      return this.highlightStore.categoryLabel;
    },
    visibleBuckets() {
      return buildTimelineBarVisibleBuckets({
        buckets: this.timelineBuckets,
        visibleHourWindow: this.visibleHourWindow,
      });
    },
    visibleDataset() {
      return buildTimelineBarVisibleDataset({
        buckets: this.visibleBuckets,
        normalColor: this.themePalette.normal,
        hoverColor: this.themePalette.hover,
      });
    },
    selectionOverlay() {
      return buildTimelineBarSelectionOverlay({
        buckets: this.visibleBuckets,
        selectedCategoryLabel: this.selectedCategoryLabel,
      });
    },
  },
  watch: {
    visibleLabels() {
      this.syncChartData();
      this.syncChartOptions();
      this.clearExternalTooltip();
    },
    visibleAxisLabels() {
      this.syncChartOptions();
    },
    visibleDataset: {
      deep: true,
      handler() {
        this.syncChartData();
      },
    },
    selectionOverlay: {
      deep: true,
      handler() {
        this.syncChartOptions();
      },
    },
    isSingleDay() {
      this.syncChartOptions();
      this.clearExternalTooltip();
    },
    timeperiod_length: {
      deep: true,
      handler() {
        this.syncChartOptions();
        this.clearExternalTooltip();
      },
    },
    timeperiod_mode() {
      this.clearExternalTooltip();
    },
    themePalette: {
      deep: true,
      handler() {
        this.syncChartOptions();
      },
    },
  },
  mounted() {
    window.addEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
  },
  beforeUnmount() {
    window.removeEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
  },
  methods: {
    buildChartOptions(): ChartOptions<'bar'> {
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
          mode: 'index',
          intersect: true,
        },
        onHover: (_event: unknown, elements: unknown[]) => {
          if (!elements?.length) {
            this.clearExternalTooltip();
          }
        },
        elements: {
          bar: {
            borderSkipped: false,
            borderRadius: 0,
            inflateAmount: 1,
          },
        },
        onClick: (_event: unknown, elements: unknown[]) => {
          if (!elements?.length) {
            this.highlightStore.clear();
          }
        },
        plugins: {
          tooltip: {
            enabled: false,
            external: context => {
              this.syncExternalTooltip(context);
            },
            mode: 'index',
            intersect: true,
          },
          legend: {
            display: false,
          },
          timelineSelectionOverlay: {
            ratios: [],
            color: this.themePalette.active,
          },
        },
        scales: {
          x: {
            display: true,
            stacked: false,
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
              color: this.themePalette.axis,
              font: {
                size: this.isSingleDay ? 10 : 11,
              },
              maxRotation: 0,
              minRotation: 0,
              padding: 8,
              callback: (_value, index) => this.visibleAxisLabels[index] ?? '',
            },
          },
          y: {
            stacked: false,
            min: 0,
            max: undefined,
            grace: '10%',
            border: {
              display: false,
            },
            grid: {
              color: this.themePalette.grid,
              drawOnChartArea: true,
              drawTicks: false,
            },
            ticks: {
              autoSkip: false,
              callback: formatTimelineBarHourTick,
              stepSize: 1,
              color: this.themePalette.axis,
              font: {
                size: 11,
              },
              maxTicksLimit: 6,
              padding: 8,
            },
          },
        },
      } as TimelineChartOptionsState;
    },
    syncChartData() {
      this.chartDataState = buildTimelineBarChartData({
        labels: this.visibleLabels,
        datasets: this.visibleDataset,
      });
    },
    syncChartOptions() {
      if (!this.chartOptionsState) {
        return;
      }

      this.chartOptionsState.scales.x.ticks.color = this.themePalette.axis;
      this.chartOptionsState.scales.x.ticks.font.size = this.isSingleDay ? 10 : 11;
      this.chartOptionsState.scales.y.max = this.isSingleDay ? 1 : undefined;
      this.chartOptionsState.scales.y.grace = this.isSingleDay ? 0 : '10%';
      this.chartOptionsState.scales.y.grid.color = this.themePalette.grid;
      this.chartOptionsState.scales.y.ticks.stepSize = this.isSingleDay ? 0.25 : 1;
      this.chartOptionsState.scales.y.ticks.color = this.themePalette.axis;
      this.chartOptionsState.scales.y.ticks.font.size = 11;
      this.chartOptionsState.scales.y.ticks.maxTicksLimit = this.isSingleDay ? 5 : 6;
      this.chartOptionsState.plugins.timelineSelectionOverlay.ratios = this.selectionOverlay.ratios;
      this.chartOptionsState.plugins.timelineSelectionOverlay.color = this.themePalette.active;
    },
    syncExternalTooltip(context: TimelineTooltipContext) {
      const tooltip = context?.tooltip;
      const chart = context?.chart;

      if (!tooltip || !chart || tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
        this.clearExternalTooltip();
        return;
      }

      const dataIndex = tooltip.dataPoints[0].dataIndex;
      const preview = buildTimelineBarTooltipPreview({
        buckets: this.visibleBuckets,
        start: this.timeperiod_start as string,
        timeperiodLength: this.timeperiod_length as [number, string],
        periodMode: this.timeperiod_mode as ActivityPeriodMode | null,
        visibleHourWindow: this.visibleHourWindow,
        dataIndex,
      });
      if (!preview) {
        this.clearExternalTooltip();
        return;
      }

      this.hoveredPreview = preview;

      const rect = chart.canvas?.getBoundingClientRect?.();
      if (!rect) {
        return;
      }

      if (this.hoveredDataIndex !== dataIndex || !this.hoveredStack) {
        this.hoveredDataIndex = dataIndex;
        this.hoveredStack = null;
        this.hoveredTooltipLoading = true;
        const currentNonce = ++this.hoveredTooltipNonce;
        nextTick(() => {
          this.positionExternalTooltip(rect.left + tooltip.caretX, rect.top + tooltip.caretY);
        });
        requestAnimationFrame(() => {
          if (currentNonce !== this.hoveredTooltipNonce || this.hoveredDataIndex !== dataIndex) {
            return;
          }

          this.hoveredStack = buildTimelineBarTooltipSummary({
            buckets: this.visibleBuckets,
            start: this.timeperiod_start as string,
            timeperiodLength: this.timeperiod_length as [number, string],
            periodMode: this.timeperiod_mode as ActivityPeriodMode | null,
            visibleHourWindow: this.visibleHourWindow,
            dataIndex,
          });
          this.hoveredTooltipLoading = false;
          nextTick(() => {
            this.positionExternalTooltip(rect.left + tooltip.caretX, rect.top + tooltip.caretY);
          });
        });
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
      this.hoveredPreview = null;
      this.hoveredStack = null;
      this.hoveredTooltipLoading = false;
      this.hoveredDataIndex = -1;
      this.hoveredTooltipNonce += 1;
    },
    handleThemeChange() {
      this.themeVersion += 1;
      this.syncChartOptions();
    },
  },
});
</script>
