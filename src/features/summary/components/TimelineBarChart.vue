<template>
  <div
    v-if="visibleDataset.length > 0"
    class="aw-chart-height relative flex min-h-0 flex-1 w-full overflow-hidden"
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
import { Chart, type ChartData, ChartOptions, Plugin } from 'chart.js';
import 'chart.js/auto';
import { Bar } from 'vue-chartjs';
import { defineComponent, nextTick, PropType } from 'vue';

import {
  buildTimelineBarAxisLabels,
  buildTimelineBarLabels,
  isTimelineBarSingleDay,
} from '~/features/summary/lib/timelineBarAxis';
import {
  buildTimelineBarChartOptions,
  syncTimelineBarChartOptions,
  timelineSelectionOverlayPlugin,
  type TimelineChartOptionsState,
  type TimelineTooltipContext,
} from '~/features/summary/lib/timelineBarChartConfig';
import {
  buildTimelineBarBuckets,
  buildTimelineBarChartData,
  buildTimelineBarSelectionOverlay,
  buildTimelineBarVisibleBuckets,
  buildTimelineBarVisibleDataset,
  resolveTimelineBarVisibleHourWindow,
  type TimelineBarDataset,
} from '~/features/summary/lib/timelineBarDataset';
import {
  buildTimelineBarTooltipPreview,
  buildTimelineBarTooltipSummary,
  resolveTimelineTooltipPosition,
} from '~/features/summary/lib/timelineBarTooltip';
import type { CategoryPeriodData, SummaryPeriodMode } from '~/features/summary/lib/summaryTypes';
import {
  ACTIVITY_AXIS_COLOR,
  ACTIVITY_GRID_COLOR,
  ACTIVITY_HIGHLIGHT,
  ACTIVITY_HOVER,
  ACTIVITY_PRIMARY_BAR,
} from '~/shared/lib/visualizationTokens';
import { resolveThemeColor, resolveThemeColorAlpha, THEME_CHANGE_EVENT } from '~/shared/lib/theme';

Chart.defaults.maintainAspectRatio = false;

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
      type: String as PropType<SummaryPeriodMode>,
      default: 'day',
    },
    selectedCategoryLabel: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: ['clear-selection'],
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
    chartData(): ChartData<'bar', number[]> {
      return this.chartDataState;
    },
    chartOptions(): ChartOptions<'bar'> {
      return this.chartOptionsState || {};
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
        this.timeperiod_mode as SummaryPeriodMode
      );
    },
    labels() {
      return buildTimelineBarLabels({
        start: this.timeperiod_start as string,
        timeperiodLength: this.timeperiod_length as [number, string],
        isSingleDay: this.isSingleDay,
        hourOffset: 0,
        periodMode: this.timeperiod_mode as SummaryPeriodMode | null,
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
        periodMode: this.timeperiod_mode as SummaryPeriodMode | null,
        isSingleDay: this.isSingleDay,
      });
    },
    visibleAxisLabels() {
      const { start, end } = this.visibleHourWindow;
      return this.axisLabels.slice(start, end + 1);
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
    buildChartOptions(): TimelineChartOptionsState {
      return buildTimelineBarChartOptions({
        palette: this.themePalette,
        isSingleDay: this.isSingleDay,
        axisLabels: this.visibleAxisLabels,
        clearTooltip: () => this.clearExternalTooltip(),
        clearSelection: () => this.$emit('clear-selection'),
        showTooltip: context => this.syncExternalTooltip(context),
      });
    },
    syncChartData() {
      this.chartDataState = buildTimelineBarChartData({
        labels: this.visibleLabels,
        datasets: this.visibleDataset || [],
      });
    },
    syncChartOptions() {
      if (!this.chartOptionsState) {
        return;
      }

      syncTimelineBarChartOptions({
        options: this.chartOptionsState,
        palette: this.themePalette,
        isSingleDay: this.isSingleDay,
        axisLabels: this.visibleAxisLabels,
        selectionRatios: this.selectionOverlay.ratios,
      });
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
        periodMode: this.timeperiod_mode as SummaryPeriodMode | null,
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
            periodMode: this.timeperiod_mode as SummaryPeriodMode | null,
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
      const position = resolveTimelineTooltipPosition({
        clientX,
        clientY,
        tooltipWidth: tooltipEl?.offsetWidth ?? 384,
        tooltipHeight: tooltipEl?.offsetHeight ?? 280,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
      this.tooltipX = position.x;
      this.tooltipY = position.y;
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
