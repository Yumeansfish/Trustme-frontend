<template>
  <div class="flex h-full min-h-0 flex-col gap-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-2">
        <h1 class="aw-page-title">Away Session</h1>
        <p class="aw-caption max-w-3xl">
          Track focused offline work and sync it back into Activity.
        </p>
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
            <div class="text-foreground-muted text-lg">
              {{ activeTimer ? 'Away session running' : "Today's recorded time" }}
            </div>
            <div class="text-foreground-subtle text-sm" v-if="activeTimer">
              {{ activeTimer.data.label || 'Away session' }}
            </div>
            <div class="text-foreground-subtle text-sm" v-else-if="todayTrackedLoaded">
              Computer activity logged since {{ settingsStore.startOfDay }}
            </div>
            <div class="text-foreground-subtle text-sm" v-else>Loading today's activity…</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <ui-button
            class="aw-btn aw-btn-lg aw-btn-stopwatch"
            type="button"
            :disabled="!activeTimer && !canStopTracking"
            @click="handlePrimaryAction"
          >
            <icon :name="activeTimer ? 'play' : 'stop'"></icon>
            <span>{{ activeTimer ? 'Start' : 'Stop' }}</span>
          </ui-button>
        </div>

        <p class="aw-caption max-w-xs text-center">
          {{
            activeTimer
              ? 'Saved to Activity when you press Start.'
              : 'Pick a card, then press Stop.'
          }}
        </p>
      </section>

      <section class="aw-card flex min-h-0 flex-col gap-4 p-5">
        <div class="space-y-1">
          <h2 class="aw-subtitle">What you will do</h2>
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
            @keydown.enter.prevent="selectShortcut(shortcut.key)"
            @keydown.space.prevent="selectShortcut(shortcut.key)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-3">
                <span class="text-foreground-strong text-base font-semibold">{{ shortcut.title }}</span>
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

        <div class="aw-card-muted space-y-2" v-if="activeTimer">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-foreground-strong text-sm font-semibold">Stop timer record</div>
              <div class="text-foreground text-base">{{ activeTimer.data.label || 'Away session' }}</div>
            </div>
            <span class="aw-chip">{{ friendlyduration(elapsedSeconds) }}</span>
          </div>
          <p class="aw-caption">
            This interval will be written to Activity after you press Start.
          </p>
        </div>
      </section>
    </div>

  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';

import { appQuery } from '~/app/lib/queries';
import { get_day_period, get_today_with_offset } from '~/app/lib/time';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import { useCategoryStore } from '~/features/categorization/store/categories';
import ThemeToggleButton from '~/features/settings/components/ThemeToggleButton.vue';
import { useSettingsStore } from '~/features/settings/store/settings';
import { useToast } from '~/shared/composables/useToast';

export default {
  name: 'Stopwatch',
  components: {
    ThemeToggleButton,
  },
  data: () => {
    return {
      bucket_id: 'aw-stopwatch',
      events: [],
      bucketsStore: useBucketsStore(),
      categoryStore: useCategoryStore(),
      settingsStore: useSettingsStore(),
      customLabel: '',
      selectedShortcutKey: '',
      shortcuts: [
        {
          key: 'write-algo',
          title: 'Write Algo',
          description: 'Work through logic before you code it.',
          icon: 'code',
        },
        {
          key: 'design-draft',
          title: 'Design Draft',
          description: 'Shape structure, flow, or layout first.',
          icon: 'palette',
        },
        {
          key: 'plan-roadmap',
          title: 'Plan Roadmap',
          description: 'Line up next steps, tradeoffs, and order.',
          icon: 'calendar',
        },
        {
          key: 'deep-reading',
          title: 'Deep Reading',
          description: 'Read a paper, spec, or doc without noise.',
          icon: 'file',
        },
        {
          key: 'other',
          title: 'Other',
          description: 'Type something custom when none of these fit.',
          icon: 'question-circle',
          isOther: true,
        },
        {
          key: 'whiteboard-session',
          title: 'Whiteboard Session',
          description: 'Think through structure away from the keyboard.',
          icon: 'edit',
        },
        {
          key: 'meeting-notes',
          title: 'Meeting Notes',
          description: 'Capture notes, action items, or follow-ups.',
          icon: 'list',
        },
        {
          key: 'research-review',
          title: 'Research Review',
          description: 'Compare sources, ideas, or implementation options.',
          icon: 'search',
        },
        {
          key: 'system-design',
          title: 'System Design',
          description: 'Map architecture, interfaces, or data flow.',
          icon: 'desktop',
        },
      ] as { key: string; title: string; description: string; icon: string; isOther?: boolean }[],
      now: moment(),
      tickHandle: null as ReturnType<typeof setInterval> | null,
      refreshHandle: null as ReturnType<typeof setInterval> | null,
      presenceHandle: null as ReturnType<typeof setInterval> | null,
      todayTrackedLoaded: false,
      todayTrackedSeconds: 0,
      todayTrackedLiveActive: false,
      todayTrackedSyncedAt: null as ReturnType<typeof moment> | null,
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
      return this.shortcuts.find(shortcut => shortcut.key === this.selectedShortcutKey) || null;
    },
    resolvedLabel() {
      if (this.selectedShortcutConfig?.isOther) {
        return this.customLabel.trim();
      }
      return this.selectedShortcutConfig?.title || '';
    },
    elapsedSeconds() {
      if (!this.activeTimer) {
        return 0;
      }
      return Math.max(0, moment(this.now).diff(moment(this.activeTimer.timestamp), 'seconds'));
    },
    canStopTracking() {
      return this.resolvedLabel.length > 0;
    },
    liveTrackedSeconds() {
      if (!this.todayTrackedLoaded) {
        return 0;
      }

      if (!this.todayTrackedLiveActive || !this.todayTrackedSyncedAt) {
        return this.todayTrackedSeconds;
      }

      return (
        this.todayTrackedSeconds +
        Math.max(0, moment(this.now).diff(this.todayTrackedSyncedAt, 'seconds'))
      );
    },
    displayTimer() {
      const displaySeconds = this.activeTimer ? this.elapsedSeconds : this.liveTrackedSeconds;
      const duration = moment.duration(displaySeconds, 'seconds');
      const hours = Math.floor(duration.asHours()).toString().padStart(2, '0');
      const minutes = duration.minutes().toString().padStart(2, '0');
      const seconds = duration.seconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    },
    focusRingStyle() {
      const referenceSeconds = this.activeTimer ? this.elapsedSeconds : this.liveTrackedSeconds;
      const targetSeconds = this.activeTimer ? 90 * 60 : 8 * 60 * 60;
      const progress = Math.min(referenceSeconds / targetSeconds, 0.98);
      return {
        background: `conic-gradient(rgb(var(--summary-vis-normal)) ${
          progress * 360
        }deg, rgb(var(--summary-vis-hover) / 0.18) 0deg)`,
      };
    },
    timerDisplayStyle() {
      return {
        color: 'rgb(var(--summary-vis-normal))',
      };
    },
  },
  mounted: async function () {
    await this.$aw.ensureBucket(this.bucket_id, 'general.stopwatch', 'unknown');
    await this.bucketsStore.ensureLoaded();
    if (this.categoryStore.classes.length === 0) {
      this.categoryStore.load();
    }
    await Promise.all([this.getEvents(), this.refreshTodayTracked()]);
    this.tickHandle = setInterval(() => {
      this.now = moment();
    }, 1000);
    this.refreshHandle = setInterval(() => {
      this.refreshTodayTracked();
    }, 30000);
    this.presenceHandle = setInterval(() => {
      this.refreshLiveStatus();
    }, 5000);
  },
  beforeUnmount() {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
    }
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
    if (this.presenceHandle) {
      clearInterval(this.presenceHandle);
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
        info('Add a label first', 'Describe what you are about to do before stopping tracking.');
        return;
      }

      await this.startAwaySession(nextLabel);
    },

    async startAwaySession(label = this.resolvedLabel) {
      if (this.activeTimer) {
        const { info } = useToast();
        info(
          'Away session already running',
          'Press Start before beginning another manual session.'
        );
        return;
      }

      const normalizedLabel = (label || '').trim();
      const event = {
        timestamp: new Date(),
        data: {
          running: true,
          label: normalizedLabel,
          $manual_away: true,
          $category: [normalizedLabel],
        },
      };
      await this.$aw.heartbeat(this.bucket_id, 1, event);
      await this.getEvents();
    },

    async resumeTracking() {
      if (!this.activeTimer) {
        return;
      }

      const updatedEvent = JSON.parse(JSON.stringify(this.activeTimer));
      updatedEvent.data.running = false;
      updatedEvent.duration = moment().diff(moment(updatedEvent.timestamp), 'seconds', true);
      await this.$aw.replaceEvent(this.bucket_id, updatedEvent);
      await this.getEvents();
      await this.refreshTodayTracked();
      this.selectedShortcutKey = '';
      this.customLabel = '';
    },

    desktopHosts() {
      return this.bucketsStore.hosts.filter(host => {
        return (
          host &&
          this.bucketsStore.bucketsAFK(host).length > 0 &&
          this.bucketsStore.bucketsWindow(host).length > 0
        );
      });
    },

    androidBuckets() {
      return _.uniq(
        _.flatten(this.bucketsStore.hosts.map(host => this.bucketsStore.bucketsAndroid(host)))
      );
    },

    async queryTodayTrackedDuration() {
      const today = get_today_with_offset(this.settingsStore.startOfDay);
      const range = get_day_period(today, this.settingsStore.startOfDay);
      let trackedSeconds = 0;

      const desktopHosts = this.desktopHosts();
      const afkBuckets = _.uniq(
        _.flatten(desktopHosts.map(host => this.bucketsStore.bucketsAFK(host)))
      );
      if (afkBuckets.length > 0) {
        const notAfkQuery = ['not_afk = [];'];
        afkBuckets.forEach(bucketId => {
          notAfkQuery.push(`not_afk_curr = flood(query_bucket("${bucketId}"));`);
          notAfkQuery.push('not_afk_curr = filter_keyvals(not_afk_curr, "status", ["not-afk"]);');
          notAfkQuery.push('not_afk = union_no_overlap(not_afk, not_afk_curr);');
        });
        notAfkQuery.push('RETURN = sum_durations(not_afk);');
        const result = await this.$aw.query([range], notAfkQuery);
        trackedSeconds = Number(result?.[0] || 0);
      } else {
        const androidBuckets = this.androidBuckets();
        if (androidBuckets.length > 0) {
          const result = await this.$aw.query([range], appQuery(androidBuckets[0], [], []));
          trackedSeconds = Number(result?.[0]?.duration || 0);
        }
      }

      // Manual away sessions are stored in aw-stopwatch and should be added to recorded time.
      const stopwatchDurationResult = await this.$aw.query([range], [
        `events = query_bucket("${this.bucket_id}");`,
        'events = filter_keyvals(events, "running", [false]);',
        'RETURN = sum_durations(events);',
      ]);
      const awaySeconds = Number(stopwatchDurationResult?.[0] || 0);

      return trackedSeconds + awaySeconds;
    },

    async getLatestBucketEvent(bucketId: string) {
      const events = await this.$aw.getEvents(bucketId, { limit: 1 });
      return Array.isArray(events) && events.length > 0 ? events[0] : null;
    },

    isRecentBucketEvent(event) {
      if (!event?.timestamp) {
        return false;
      }

      const end = moment(event.timestamp).add(Number(event.duration || 0), 'seconds');
      return end.isAfter(moment().subtract(15, 'seconds'));
    },

    async queryLiveStatus() {
      const afkBuckets = _.uniq(
        _.flatten(this.desktopHosts().map(host => this.bucketsStore.bucketsAFK(host)))
      );

      if (afkBuckets.length > 0) {
        const latestEvents = await Promise.all(
          afkBuckets.map(bucketId => this.getLatestBucketEvent(bucketId))
        );
        return latestEvents.some(event => {
          return event?.data?.status === 'not-afk' && this.isRecentBucketEvent(event);
        });
      }

      const androidBuckets = this.androidBuckets();
      if (androidBuckets.length > 0) {
        const latestEvent = await this.getLatestBucketEvent(androidBuckets[0]);
        return this.isRecentBucketEvent(latestEvent);
      }

      return false;
    },

    async refreshLiveStatus() {
      try {
        this.todayTrackedLiveActive = await this.queryLiveStatus();
      } catch (error) {
        console.error('Failed to refresh live tracked status:', error);
      }
    },

    async refreshTodayTracked() {
      try {
        const [trackedSeconds, liveActive] = await Promise.all([
          this.queryTodayTrackedDuration(),
          this.queryLiveStatus(),
        ]);
        this.todayTrackedSeconds = trackedSeconds;
        this.todayTrackedLiveActive = liveActive;
        this.todayTrackedSyncedAt = moment();
        this.todayTrackedLoaded = true;
      } catch (error) {
        console.error('Failed to refresh today tracked time:', error);
        this.todayTrackedLoaded = true;
      }
    },

    async getEvents() {
      const events = await this.$aw.getEvents(this.bucket_id, { limit: 100 });
      this.events = _.orderBy(events, event => event.timestamp, 'desc');
    },
  },
};
</script>
