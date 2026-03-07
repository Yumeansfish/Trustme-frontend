<template lang="pug">
div(v-if="categoryData && categoryData.length > 0", style="position: relative; width: 100%; display: flex; align-items: center; justify-content: center;")
  doughnut(:chart-data="chartData" :chart-options="chartOptions" :plugins="[centerTextPlugin]" style="max-width: 220px; max-height: 220px;")
div.small(v-else, style="font-size: 14pt; color: #aaa; text-align: center; padding: 40px 0;")
  | No data
</template>

<script lang="ts">
import 'chart.js/auto';
import { Doughnut } from 'vue-chartjs/legacy';
import { useActivityStore } from '~/stores/activity';

// Rize Indigo palette — from deep to soft
const INDIGO_SHADES = [
  '#5e5ce6', // primary
  '#7b7aed',
  '#9897f3',
  '#b5b4f7',
  '#d0cffa',
  '#e8e7fd',
  '#c4a6ff',
  '#a68eef',
  '#8876d8',
  '#6b5ec2',
];

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
}

export default {
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
      const colors = this.categoryData.map((_, i) => INDIGO_SHADES[i % INDIGO_SHADES.length]);

      return {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverBorderColor: '#ffffff',
            hoverBorderWidth: 3,
            borderRadius: 4,
          },
        ],
      };
    },
    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(30, 30, 60, 0.9)',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: ctx => {
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
    centerTextPlugin() {
      const totalDuration = this.totalDuration;
      return {
        id: 'centerText',
        afterDraw(chart) {
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const centerX = (chartArea.left + chartArea.right) / 2;
          const centerY = (chartArea.top + chartArea.bottom) / 2;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Duration text
          ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#2c3e50';
          ctx.fillText(formatDuration(totalDuration), centerX, centerY - 6);

          // Label
          ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#95a5a6';
          ctx.fillText('Total', centerX, centerY + 16);

          ctx.restore();
        },
      };
    },
  },
};
</script>

<style scoped></style>
