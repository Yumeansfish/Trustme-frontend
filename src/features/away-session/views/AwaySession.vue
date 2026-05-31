<template>
  <div class="flex h-full min-h-0 flex-col gap-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-2">
        <h1 class="aw-page-title aw-title-system">Away Session</h1>
      </div>
      <theme-toggle-button floating></theme-toggle-button>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section class="aw-card flex flex-col items-center justify-center gap-5 px-6 py-7">
        <div class="aw-focus-ring" :style="focusRingStyle">
          <div class="aw-focus-ring-inner">
            <div class="text-6xl font-bold tracking-tight" :style="timerDisplayStyle">
              {{ displayTimer }}
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <ui-button
            class="aw-btn aw-btn-lg aw-btn-away-session"
            type="button"
            :disabled="!activeTimer && !canStopTracking"
            @click="handlePrimaryAction"
          >
            <icon :name="primaryActionCopy.icon"></icon>
            <span>{{ primaryActionCopy.label }}</span>
          </ui-button>
        </div>
      </section>

      <section class="aw-card flex min-h-0 flex-col gap-4 p-5">
        <div class="space-y-1">
          <h2 class="aw-subtitle aw-title-system">What you will do</h2>
        </div>

        <div class="grid gap-3 md:grid-cols-3">
          <div
            v-for="shortcut in shortcuts"
            :key="shortcut.key"
            class="aw-shortcut-card"
            :class="[
              selectedShortcutKey === shortcut.key ? 'aw-shortcut-card-active' : '',
              activeTimer ? 'cursor-not-allowed opacity-60' : '',
            ]"
            role="button"
            :tabindex="activeTimer ? -1 : 0"
            :aria-disabled="Boolean(activeTimer)"
            :aria-pressed="selectedShortcutKey === shortcut.key"
            @click="selectShortcut(shortcut.key)"
            @keydown.enter.prevent.self="selectShortcut(shortcut.key)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-3">
                <span class="text-foreground-strong text-base font-semibold">{{
                  shortcut.title
                }}</span>
                <p class="text-foreground-muted text-sm leading-6">
                  {{ shortcut.description }}
                </p>
              </div>
              <span class="aw-shortcut-card-icon">
                <icon :name="shortcut.icon" class="h-5 w-5"></icon>
              </span>
            </div>
            <div
              v-if="shortcut.isOther && selectedShortcutKey === shortcut.key"
              class="mt-4"
              @click.stop
            >
              <ui-input
                class="aw-input h-11"
                v-model="customLabel"
                type="text"
                placeholder="Type a category"
                :disabled="Boolean(activeTimer)"
                @keydown.enter.stop="triggerStopTracking"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';

import { getClient } from '~/app/lib/awclient';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import {
  buildAwaySessionStartEvent,
  buildAwaySessionStopEvent,
  createAwaySessionSelectionReset,
} from '~/features/away-session/lib/awaySessionEvents';
import {
  buildAwaySessionFocusRingStyle,
  buildAwaySessionTimerDisplayStyle,
  formatAwaySessionTimerDisplay,
  resolveAwaySessionLabel,
  resolveSelectedAwayShortcut,
} from '~/features/away-session/lib/awaySessionPresentation';
import { orderAwaySessionEvents } from '~/features/away-session/lib/awaySessionRuntime';
import { resolveAwaySessionPrimaryActionCopy } from '~/features/away-session/lib/awaySessionState';
import { AWAY_SESSION_SHORTCUTS } from '~/features/away-session/lib/awaySessionShortcuts';
import { useToast } from '~/shared/composables/useToast';

export default {
  name: 'AwaySessionView',
  components: {
    ThemeToggleButton,
  },
  data: () => {
    return {
      bucket_id: 'aw-stopwatch',
      events: [],
      customLabel: '',
      selectedShortcutKey: '',
      shortcuts: AWAY_SESSION_SHORTCUTS,
      now: moment(),
      tickHandle: null as ReturnType<typeof setInterval> | null,
    };
  },
  computed: {
    runningTimers() {
      return _.orderBy(
        _.filter(this.events, e => e.data.running),
        e => e.timestamp,
        'desc'
      );
    },
    activeTimer() {
      return this.runningTimers[0] || null;
    },
    selectedShortcutConfig() {
      return resolveSelectedAwayShortcut(this.shortcuts, this.selectedShortcutKey);
    },
    resolvedLabel() {
      return resolveAwaySessionLabel(this.selectedShortcutConfig, this.customLabel);
    },
    elapsedSeconds() {
      if (!this.activeTimer) {
        return 0;
      }
      return Math.max(0, moment(this.now).diff(moment(this.activeTimer.timestamp), 'seconds'));
    },
    primaryActionCopy() {
      return resolveAwaySessionPrimaryActionCopy(Boolean(this.activeTimer));
    },
    canStopTracking() {
      return this.resolvedLabel.length > 0;
    },
    displayTimer() {
      return formatAwaySessionTimerDisplay(this.elapsedSeconds, 0, Boolean(this.activeTimer));
    },
    focusRingStyle() {
      return buildAwaySessionFocusRingStyle(this.elapsedSeconds, 0, Boolean(this.activeTimer));
    },
    timerDisplayStyle() {
      return buildAwaySessionTimerDisplayStyle();
    },
  },
  mounted: async function () {
    await getClient().ensureBucket(this.bucket_id, 'general.stopwatch', 'unknown');
    await this.getEvents();
    this.tickHandle = setInterval(() => {
      this.now = moment();
    }, 1000);
  },
  beforeUnmount() {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
    }
  },
  methods: {
    selectShortcut(shortcutKey: string) {
      if (this.activeTimer) {
        return;
      }
      this.selectedShortcutKey = shortcutKey;
    },

    async handlePrimaryAction() {
      if (this.activeTimer) {
        await this.resumeTracking();
        return;
      }

      await this.triggerStopTracking();
    },

    async triggerStopTracking(label = this.resolvedLabel) {
      const nextLabel = (label || '').trim();
      if (!nextLabel) {
        const { info } = useToast();
        info(
          'Add a label first',
          'Describe what you are about to do before starting an away session.'
        );
        return;
      }

      await this.startAwaySession(nextLabel);
    },

    async startAwaySession(label = this.resolvedLabel) {
      if (this.activeTimer) {
        const { info } = useToast();
        info(
          'Away session already running',
          'Resume tracking before starting another away session.'
        );
        return;
      }

      const event = buildAwaySessionStartEvent(label);
      await getClient().heartbeat(this.bucket_id, 1, event as any);
      await this.getEvents();
    },

    async resumeTracking() {
      if (!this.activeTimer) {
        return;
      }

      const updatedEvent = buildAwaySessionStopEvent(this.activeTimer, moment());
      await getClient().replaceEvent(this.bucket_id, updatedEvent);
      await this.getEvents();
      Object.assign(this, createAwaySessionSelectionReset());
    },

    async getEvents() {
      this.events = orderAwaySessionEvents(
        await getClient().getEvents(this.bucket_id, { limit: 100 })
      );
    },
  },
};
</script>
