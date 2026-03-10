<template>
  <div
    class="flex h-full min-h-0 items-center justify-center overflow-hidden"
    v-if="categoryEntries.length > 0"
  >
    <doughnut
      class="aw-donut-chart"
      :chart-data="chartData"
      :chart-options="chartOptions"
      :plugins="[centerTextPlugin]"
    ></doughnut>
  </div>
  <div class="aw-empty-state" v-else>No data</div>
</template>

<script lang="ts">
import 'chart.js/auto';
import { Doughnut } from 'vue-chartjs';
import { defineComponent } from 'vue';

import { useActivityStore } from '~/features/activity/store/activity';
import { useActivityHighlightStore } from '~/features/activity/store/highlight';
import {
  ACTIVITY_HIGHLIGHT,
  ACTIVITY_HIGHLIGHT_BORDER,
} from '~/features/activity/lib/visualizationTokens';
import { getColorFromString } from '~/features/categorization/lib/color';
import {
  CATEGORY_DONUT_BORDER,
  CATEGORY_DONUT_CENTER_PRIMARY,
  CATEGORY_DONUT_CENTER_SECONDARY,
  CATEGORY_DONUT_TOOLTIP_BG,
} from '~/features/categorization/lib/visualizationTokens';

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0m';
  }
  const hrs = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
}

function categoryLabel(category: string[] | null | undefined): string {
  return Array.isArray(category) && category.length > 0 ? category.join(' > ') : 'Uncategorized';
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

function resolveThemeColor(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value ? `rgb(${value})` : fallback;
}

export default defineComponent({
  name: 'CategoryDonut',
  components: { Doughnut },
  computed: {
    activityStore() {
      return useActivityStore();
    },
    highlightStore() {
      return useActivityHighlightStore();
    },
    categoryEntries() {
      return (this.activityStore.category?.top || [])
        .filter(entry => entry.duration > 0)
        .map(entry => ({
          label: categoryLabel(entry.data?.['$category']),
          duration: entry.duration,
          category: entry.data?.['$category'] || null,
          color:
            entry.data?.['$color'] || getColorFromString(categoryLabel(entry.data?.['$category'])),
        }));
    },
    appEntries() {
      return (this.activityStore.window?.top_apps || [])
        .filter(entry => entry.duration > 0)
        .map(entry => ({
          label: entry.data?.app || 'Unknown app',
          duration: entry.duration,
          category: entry.data?.['$category'] || null,
          color: getColorFromString(entry.data?.app || 'Unknown app'),
        }));
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
      return {
        labels: this.categoryEntries.map(entry => entry.label),
        datasets: [
          {
            label: 'Categories',
            data: this.categoryEntries.map(
              entry => Math.round((entry.duration / 3600) * 1000) / 1000
            ),
            backgroundColor: this.categoryEntries.map(entry => {
              const isSelected = this.selectedCategoryLabel === entry.label;
              const isDimmed =
                this.selectedCategoryLabel && this.selectedCategoryLabel !== entry.label;
              return isSelected
                ? ACTIVITY_HIGHLIGHT
                : isDimmed
                ? hexToRgba(entry.color, 0.22)
                : entry.color;
            }),
            borderWidth: this.categoryEntries.map(entry =>
              this.selectedCategoryLabel === entry.label ? 4 : 2
            ),
            borderColor: this.categoryEntries.map(entry =>
              this.selectedCategoryLabel === entry.label
                ? ACTIVITY_HIGHLIGHT_BORDER
                : CATEGORY_DONUT_BORDER
            ),
            hoverBorderColor: this.categoryEntries.map(entry =>
              this.selectedCategoryLabel === entry.label
                ? ACTIVITY_HIGHLIGHT_BORDER
                : CATEGORY_DONUT_BORDER
            ),
            borderRadius: 6,
            spacing: 2,
            radius: '72%',
            cutout: '48%',
          },
          {
            label: 'Applications',
            data: this.appEntries.map(entry => Math.round((entry.duration / 3600) * 1000) / 1000),
            backgroundColor: this.appEntries.map(entry => {
              const isSelected = this.selectedAppLabel === entry.label;
              const isDimmed = this.selectedAppLabel && this.selectedAppLabel !== entry.label;
              return isSelected
                ? ACTIVITY_HIGHLIGHT
                : isDimmed
                ? hexToRgba(entry.color, 0.22)
                : entry.color;
            }),
            borderWidth: this.appEntries.map(entry =>
              this.selectedAppLabel === entry.label ? 4 : 2
            ),
            borderColor: this.appEntries.map(entry =>
              this.selectedAppLabel === entry.label
                ? ACTIVITY_HIGHLIGHT_BORDER
                : CATEGORY_DONUT_BORDER
            ),
            hoverBorderColor: this.appEntries.map(entry =>
              this.selectedAppLabel === entry.label
                ? ACTIVITY_HIGHLIGHT_BORDER
                : CATEGORY_DONUT_BORDER
            ),
            borderRadius: 6,
            spacing: 2,
            radius: '100%',
            cutout: '78%',
          },
        ],
      };
    },
    chartOptions(): any {
      return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: CATEGORY_DONUT_TOOLTIP_BG,
            displayColors: false,
            titleFont: { size: 0 },
            bodyFont: { size: 12, weight: '600' },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: () => '',
              label: (ctx: any) => {
                const seconds = ctx.raw * 3600;
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
        onClick: (_event: unknown, elements: any[]) => {
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
    centerTextPlugin(): any {
      const selectedCategory = this.categoryEntries.find(
        entry => entry.label === this.selectedCategoryLabel
      );
      const selectedApp = this.appEntries.find(entry => entry.label === this.selectedAppLabel);
      const activeEntry = selectedApp || selectedCategory || null;

      return {
        id: 'centerText',
        afterDraw(chart: any) {
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

          ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = primaryTextColor;
          ctx.fillText(
            formatDuration(activeEntry ? activeEntry.duration : this.totalTrackedDuration),
            centerX,
            centerY - 8
          );

          ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = secondaryTextColor;
          ctx.fillText(activeEntry ? activeEntry.label : 'All activity', centerX, centerY + 16);

          ctx.restore();
        },
      };
    },
  },
});
</script>
