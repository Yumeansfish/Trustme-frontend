<template>
  <div v-if="state.kind === 'loading'" class="aw-activity-redirect">Loading activity…</div>
  <div v-else-if="state.kind === 'empty'" class="aw-activity-redirect px-4">
    <section
      class="w-full max-w-2xl rounded-3xl border border-base bg-surface px-6 py-8 text-center shadow-card"
    >
      <div class="space-y-3">
        <div class="flex justify-center">
          <icon
            class="text-foreground-subtle"
            :name="state.reason === 'load-failed' ? 'info-circle' : 'desktop'"
            :size="42"
          ></icon>
        </div>
        <div class="space-y-1.5">
          <h3 class="text-lg font-semibold text-foreground-strong">{{ state.title }}</h3>
          <p class="text-sm text-foreground-muted">{{ state.message }}</p>
        </div>
        <div class="flex flex-wrap justify-center gap-3 pt-2">
          <ui-button
            v-if="state.reason === 'load-failed'"
            class="aw-btn aw-btn-md aw-btn-primary"
            type="button"
            @click="resolveRedirect"
          >
            Retry
          </ui-button>
          <ui-button
            v-else
            class="aw-btn aw-btn-md aw-btn-primary"
            type="button"
            @click="openSettings"
          >
            Open settings
          </ui-button>
          <ui-button class="aw-btn aw-btn-md aw-btn-secondary" type="button" @click="openBuckets">
            Open buckets
          </ui-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { fetchActivityScope } from '~/features/activity/lib/activityScopeClient';
import {
  resolveActivityRedirectOutcome,
  type ActivityRedirectOutcome,
} from '../lib/activityRedirect';

type ActivityRedirectViewState = ActivityRedirectOutcome | { kind: 'loading' };

export default defineComponent({
  name: 'ActivityRedirect',
  data() {
    return {
      state: {
        kind: 'loading',
      } as ActivityRedirectViewState,
    };
  },
  async mounted() {
    await this.resolveRedirect();
  },
  methods: {
    async resolveRedirect() {
      this.state = { kind: 'loading' };

      try {
        const activityScope = await fetchActivityScope();
        const outcome = resolveActivityRedirectOutcome({
          activityScope,
        });

        if (outcome.kind === 'redirect') {
          await this.$router.replace(outcome.path);
          return;
        }

        this.state = outcome;
      } catch (error) {
        console.warn('Failed to resolve Activity redirect state', error);
        this.state = resolveActivityRedirectOutcome({
          activityScope: null,
        });
      }
    },
    async openSettings() {
      await this.$router.push('/settings');
    },
    async openBuckets() {
      await this.$router.push('/buckets');
    },
  },
});
</script>
