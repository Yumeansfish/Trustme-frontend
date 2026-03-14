<template>
  <div class="space-y-8">
    <section class="flex items-start justify-between gap-4">
      <div class="space-y-2">
        <h1 class="text-4xl font-semibold tracking-tight text-foreground-emphasis">
          Check-Ins
        </h1>
        <p class="max-w-2xl text-sm leading-7 text-foreground-subtle">
          Session summaries will appear here once the local check-in data source is connected.
        </p>
      </div>
      <theme-toggle-button />
    </section>

    <section class="rounded-3xl border border-base bg-surface px-6 py-8 shadow-card">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="card in cards"
          :key="card.title"
          class="rounded-2xl border border-base bg-surface-raised px-5 py-5 shadow-card-subtle"
        >
          <div
            class="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-muted text-foreground-subtle"
          >
            <icon :name="card.icon" class="h-5 w-5" />
          </div>
          <h2 class="text-lg font-semibold text-foreground-emphasis">{{ card.title }}</h2>
          <p class="mt-2 text-sm leading-6 text-foreground-subtle">{{ card.copy }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';

export default defineComponent({
  name: 'StreamdeckView',
  components: {
    ThemeToggleButton,
  },
  data() {
    return {
      cards: [
        {
          icon: 'list',
          title: 'Session Timeline',
          copy: 'Recent survey windows will be grouped into compact cards here.',
        },
        {
          icon: 'calendar-day',
          title: 'Day Context',
          copy: 'Each session can later link out to the short-interval timeline view.',
        },
        {
          icon: 'sparkles',
          title: 'Semantic Answers',
          copy: 'Question prompts and feedback scales will be rendered as semantic answer chips.',
        },
      ],
    };
  },
});
</script>
