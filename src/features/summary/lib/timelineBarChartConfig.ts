import type { ChartOptions, Plugin } from 'chart.js';

import { formatTimelineBarHourTick } from '~/features/summary/lib/timelineBarAxis';

export interface TimelineChartPalette {
  active: string;
  axis: string;
  grid: string;
}

export interface TimelineTooltipContext {
  tooltip?: {
    opacity: number;
    dataPoints?: Array<{ dataIndex: number }>;
    caretX: number;
    caretY: number;
  };
  chart?: { canvas?: HTMLCanvasElement };
}

interface TimelineSelectionPluginOptions {
  ratios?: number[];
  color?: string;
}

interface MutableTimelineScale {
  ticks: {
    color?: string;
    font: { size?: number };
    callback?: (_value: string | number, index: number) => string;
    stepSize?: number;
    maxTicksLimit?: number;
  };
  grid: { color?: string };
  max?: number;
  grace?: number | string;
}

export type TimelineChartOptionsState = ChartOptions<'bar'> & {
  scales: { x: MutableTimelineScale; y: MutableTimelineScale };
  plugins: {
    timelineSelectionOverlay: TimelineSelectionPluginOptions;
  } & Record<string, unknown>;
};

interface TimelineBarElement {
  getProps(
    keys: string[],
    final?: boolean
  ): { x: number; y: number; base: number; width: number };
}

export const timelineSelectionOverlayPlugin: Plugin<'bar'> = {
  id: 'timelineSelectionOverlay',
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const options = pluginOptions as TimelineSelectionPluginOptions;
    const ratios = Array.isArray(options.ratios) ? options.ratios : [];
    const color = typeof options.color === 'string' ? options.color : '';
    if (!color || ratios.length === 0 || !ratios.some(ratio => ratio > 0)) return;

    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = color;
    meta.data.forEach((element, index) => {
      const ratio = ratios[index];
      if (!ratio || ratio <= 0) return;
      const props = (element as unknown as TimelineBarElement).getProps(
        ['x', 'y', 'base', 'width'],
        true
      );
      const totalHeight = props.base - props.y;
      if (!Number.isFinite(totalHeight) || totalHeight <= 0) return;
      const overlayHeight = totalHeight * Math.max(0, Math.min(1, ratio));
      if (overlayHeight <= 0) return;
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

export function buildTimelineBarChartOptions({
  palette,
  isSingleDay,
  axisLabels,
  clearTooltip,
  clearSelection,
  showTooltip,
}: {
  palette: TimelineChartPalette;
  isSingleDay: boolean;
  axisLabels: string[];
  clearTooltip: () => void;
  clearSelection: () => void;
  showTooltip: (context: TimelineTooltipContext) => void;
}): TimelineChartOptionsState {
  const xTickSize = isSingleDay ? 10 : 11;

  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 10, right: 12, bottom: 8, left: 4 } },
    interaction: { mode: 'index', intersect: true },
    onHover: (_event, elements) => {
      if (!elements?.length) clearTooltip();
    },
    elements: {
      bar: { borderSkipped: false, borderRadius: 0, inflateAmount: 1 },
    },
    onClick: (_event, elements) => {
      if (!elements?.length) clearSelection();
    },
    plugins: {
      tooltip: {
        enabled: false,
        external: context => showTooltip(context as TimelineTooltipContext),
        mode: 'index',
        intersect: true,
      },
      legend: { display: false },
      timelineSelectionOverlay: { ratios: [], color: palette.active },
    },
    scales: {
      x: {
        display: true,
        stacked: false,
        border: { display: false },
        grid: { display: false, drawOnChartArea: false, drawTicks: false },
        ticks: {
          display: true,
          autoSkip: false,
          color: palette.axis,
          font: { size: xTickSize },
          maxRotation: 0,
          minRotation: 0,
          padding: 8,
          callback: (_value: string | number, index: number) => axisLabels[index] ?? '',
        },
      },
      y: {
        stacked: false,
        min: 0,
        max: undefined,
        grace: '10%',
        border: { display: false },
        grid: { color: palette.grid, drawOnChartArea: true, drawTicks: false },
        ticks: {
          autoSkip: false,
          callback: formatTimelineBarHourTick,
          stepSize: 1,
          color: palette.axis,
          font: { size: 11 },
          maxTicksLimit: 6,
          padding: 8,
        },
      },
    },
  } as TimelineChartOptionsState;
}

export function syncTimelineBarChartOptions({
  options,
  palette,
  isSingleDay,
  axisLabels,
  selectionRatios,
}: {
  options: TimelineChartOptionsState;
  palette: TimelineChartPalette;
  isSingleDay: boolean;
  axisLabels: string[];
  selectionRatios: number[];
}): void {
  options.scales.x.ticks.color = palette.axis;
  options.scales.x.ticks.font.size = isSingleDay ? 10 : 11;
  options.scales.x.ticks.callback = (_value: string | number, index: number) =>
    axisLabels[index] ?? '';
  options.scales.y.max = isSingleDay ? 1 : undefined;
  options.scales.y.grace = isSingleDay ? 0 : '10%';
  options.scales.y.grid.color = palette.grid;
  options.scales.y.ticks.stepSize = isSingleDay ? 0.25 : 1;
  options.scales.y.ticks.color = palette.axis;
  options.scales.y.ticks.font.size = 11;
  options.scales.y.ticks.maxTicksLimit = isSingleDay ? 5 : 6;
  options.plugins.timelineSelectionOverlay.ratios = selectionRatios;
  options.plugins.timelineSelectionOverlay.color = palette.active;
}
