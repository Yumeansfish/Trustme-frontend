<template>
<div class="flex justify-center" v-if="categoryData && categoryData.length > 0">
  <doughnut class="aw-donut-chart" :chart-data="chartData" :chart-options="chartOptions" :plugins="[centerTextPlugin]"></doughnut>
</div>
<div class="aw-empty-state" v-else>No data</div>
</template>

<script lang="ts">
import 'chart.js/auto';
import { Doughnut } from 'vue-chartjs';
import { useActivityStore } from '~/features/activity/store/activity';
import {
  CATEGORY_DONUT_BORDER,
  CATEGORY_DONUT_CENTER_PRIMARY,
  CATEGORY_DONUT_CENTER_SECONDARY,
  CATEGORY_DONUT_PALETTE,
  CATEGORY_DONUT_TOOLTIP_BG,
} from '~/features/categorization/lib/visualizationTokens';

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
}

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CategoryDonut',
  components: { Doughnut },
  computed: {
    activityStore() {
      return useActivityStore();
    },
    categoryData() {
      return this.activityStore.category?.top || [];
    },
    totalDuration() {
      return this.categoryData.reduce((sum, e) => sum + (e.duration || 0), 0);
    },
    chartData() {
      const labels = this.categoryData.map(e => {
        const cat = e.data?.['$category'];
        return Array.isArray(cat) ? cat.join(' > ') : String(cat || 'Unknown');
      });
      const data = this.categoryData.map(e => Math.round((e.duration / 3600) * 1000) / 1000);
      const colors = this.categoryData.map((_, i) => CATEGORY_DONUT_PALETTE[i % CATEGORY_DONUT_PALETTE.length]);

      return {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: CATEGORY_DONUT_BORDER,
            hoverBorderColor: CATEGORY_DONUT_BORDER,
            hoverBorderWidth: 3,
            borderRadius: 4,
          },
        ],
      };
    },
    chartOptions(): any {
      return {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: CATEGORY_DONUT_TOOLTIP_BG,
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx: any) => {
                const seconds = ctx.parsed * 3600;
                const total = this.totalDuration;
                const pct = total > 0 ? Math.round((seconds / total) * 100) : 0;
                return ` ${pct}%  ${formatDuration(seconds)}`;
              },
            },
          },
        },
      };
    },
    centerTextPlugin(): any {
      const totalDuration = this.totalDuration;
      return {
        id: 'centerText',
        afterDraw(chart: any) {
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const centerX = (chartArea.left + chartArea.right) / 2;
          const centerY = (chartArea.top + chartArea.bottom) / 2;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Duration text
          ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = CATEGORY_DONUT_CENTER_PRIMARY;
          ctx.fillText(formatDuration(totalDuration), centerX, centerY - 6);

          // Label
          ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = CATEGORY_DONUT_CENTER_SECONDARY;
          ctx.fillText('Total', centerX, centerY + 16);

          ctx.restore();
        },
      };
    },
  },
});
</script>
