<template>
<div class="space-y-6">
  <div class="text-center">
    <div class="text-foreground-muted text-sm">Your total score today is:</div>
    <div class="aw-display-sm font-semibold" :class="score >= 0 ? 'text-success' : 'text-danger'">{{ score >= 0 ? '+' : '' }}{{ (Math.round(score * 10) / 10).toFixed(1) }}</div>
    <div class="text-foreground-subtle text-sm">({{ score_productive_percent.toFixed(1) }}% productive)</div>
  </div>
  <div class="aw-divider"></div>
  <div class="space-y-2"><b class="text-foreground-strong text-sm font-semibold">Top productive:</b>
    <div class="mt-2 flex items-start justify-between gap-4" v-for="cat in top_productive">
      <div class="min-w-0">
        <div class="text-foreground-strong font-medium">{{ cat.data.$category.slice(-1)[0] }}</div>
        <div class="aw-score-meta">{{ cat.data.$category.slice(0, -1).join(" > ") }}</div>
      </div>
      <div class="aw-score-value text-success ml-auto font-semibold">+{{ (Math.round(cat.data.$total_score * 10) / 10).toFixed(1) }}</div>
    </div>
  </div>
  <div class="aw-divider"></div>
  <div class="space-y-2"><b class="text-foreground-strong text-sm font-semibold">Top distracting:</b>
    <div class="mt-2 flex items-start justify-between gap-4" v-for="cat in top_distracting">
      <div class="min-w-0">
        <div class="text-foreground-strong font-medium">{{ cat.data.$category.slice(-1)[0] }}</div>
        <div class="aw-score-meta">{{ cat.data.$category.slice(0, -1).join(" > ") }}</div>
      </div>
      <div class="aw-score-value text-danger ml-auto font-semibold">{{ (Math.round(cat.data.$total_score * 10) / 10).toFixed(1) }}</div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import _ from 'lodash';
import { useActivityStore } from '~/features/activity/store/activity';
import { IEvent } from '~/shared/lib/interfaces';

// TODO: Maybe add a "Category Tree"-style visualization?

export default {
  name: 'aw-score',
  computed: {
    categories_with_score: function (): IEvent[] {
      // FIXME: Does this get all category time? Or just top ones?
      const top_categories = useActivityStore().category.top;
      return _.map(top_categories, cat => {
        cat.data.$total_score = (cat.duration / (60 * 60)) * cat.data.$score;
        return cat;
      });
    },
    score: function (): number {
      return _.sum(_.map(this.categories_with_score, cat => cat.data.$total_score));
    },
    score_productive_percent() {
      // Compute the percentage of time spent on productive activities (score > 0)
      const total_time = _.sumBy(this.categories_with_score as IEvent[], cat => cat.duration);
      const productive_time = _.sumBy(
        _.filter(this.categories_with_score, cat => cat.data.$total_score > 0),
        cat => cat.duration
      );
      return (productive_time / total_time) * 100;
    },
    top_productive: function () {
      return _.sortBy(
        _.filter(this.categories_with_score, cat => cat.data.$total_score > 0.1),
        c => -c.data.$total_score
      );
    },
    top_distracting: function () {
      return _.sortBy(
        _.filter(this.categories_with_score, cat => cat.data.$total_score < -0.1),
        c => c.data.$total_score
      );
    },
  },
};
</script>
