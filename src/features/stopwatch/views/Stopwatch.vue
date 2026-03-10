<template>
  <div class="flex h-full min-h-0 flex-col gap-5">
    <div class="space-y-2">
      <h1 class="aw-page-title">Away Session</h1>
      <p class="aw-caption max-w-3xl">
        Pause normal computer tracking when you step away from the keyboard. Add a label, press
        Stop, and press Start when you are back to regular ActivityWatch monitoring.
      </p>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section class="aw-card flex flex-col items-center justify-center gap-5 px-6 py-7">
        <div class="aw-focus-ring" :style="focusRingStyle">
          <div class="aw-focus-ring-inner">
            <div class="text-foreground-strong text-6xl font-bold tracking-tight">
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
            :class="
              activeTimer ? 'aw-btn aw-btn-lg aw-btn-success' : 'aw-btn aw-btn-lg aw-btn-danger'
            "
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
              ? 'Press Start when you are back on the computer and want normal ActivityWatch tracking again.'
              : 'Fill in What are you doing? first. Stop becomes available once the label is ready.'
          }}
        </p>
      </section>

      <section class="aw-card flex min-h-0 flex-col gap-4">
        <div class="space-y-1">
          <h2 class="aw-subtitle">Session details</h2>
          <p class="aw-caption">
            Describe the task you are about to do away from the keyboard. This label becomes the
            saved manual session.
          </p>
        </div>

        <label class="aw-label flex flex-col gap-2">
          <span>What are you doing?</span>
          <ui-input
            class="aw-input h-11"
            v-model="label"
            type="text"
            placeholder="Lunch, meeting, planning on paper…"
            :disabled="Boolean(activeTimer)"
            @keyup.enter="triggerStopTracking"
          />
        </label>

        <div class="aw-card-muted space-y-2">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-foreground-strong text-sm font-semibold">
                {{ activeTimer ? 'Tracking is paused' : 'Normal tracking is active' }}
              </div>
              <div class="text-foreground text-base">
                {{
                  activeTimer
                    ? activeTimer.data.label || 'Away session'
                    : 'ActivityWatch is still recording your computer time.'
                }}
              </div>
            </div>
            <span class="aw-chip">{{
              activeTimer ? friendlyduration(elapsedSeconds) : friendlyduration(liveTrackedSeconds)
            }}</span>
          </div>
          <p class="aw-caption" v-if="activeTimer">
            This manual session will shadow overlapping computer activity when you include manual
            sessions in Activity.
          </p>
          <p class="aw-caption" v-else>
            Add a label, then press Stop to begin an away session. When you return, press Start to
            resume normal tracking.
          </p>
        </div>

        <div class="space-y-2" v-if="!activeTimer && recentLabels.length > 0">
          <div class="text-foreground-strong text-sm font-semibold">Recent labels</div>
          <div class="flex flex-wrap gap-2">
            <ui-button
              v-for="recentLabel in recentLabels"
              :key="recentLabel"
              class="aw-btn aw-btn-sm aw-btn-outline"
              type="button"
              @click="useRecentLabel(recentLabel)"
            >
              {{ recentLabel }}
            </ui-button>
          </div>
        </div>

        <div class="aw-card-muted space-y-2">
          <div class="text-foreground-strong text-sm font-semibold">How this works</div>
          <ul class="text-foreground-muted space-y-1 text-sm leading-6">
            <li>
              By default, the clock shows today's computer time already recorded by ActivityWatch.
            </li>
            <li>Set a label and press Stop when you leave the computer for a focused task.</li>
            <li>Press Start when you are back to resume normal ActivityWatch tracking.</li>
          </ul>
        </div>
      </section>
    </div>

    <section class="aw-card flex min-h-0 flex-1 flex-col">
      <div class="mb-4 space-y-1">
        <h2 class="aw-subtitle">Recent away sessions</h2>
        <p class="aw-caption">
          Saved manual sessions appear here. Reuse a label quickly or edit the session afterwards.
        </p>
      </div>

      <div class="flex-1 overflow-y-auto" v-if="loading">
        <span class="text-sm text-foreground-muted">Loading…</span>
      </div>

      <div class="flex-1 overflow-y-auto" v-else-if="stoppedTimers.length > 0">
        <div v-for="day in Object.keys(timersByDate).sort().reverse()" :key="day" class="space-y-2">
          <h5 class="aw-eyebrow">{{ day }}</h5>
          <div class="space-y-2">
            <div class="aw-divider" v-if="timersByDate[day].length > 0"></div>
            <div v-for="event in timersByDate[day]" :key="event.id">
              <stopwatch-entry
                :event="event"
                :bucket_id="bucket_id"
                :now="now"
                @delete="removeTimer"
                @update="updateTimer"
                @reuse-label="useRecentLabel"
              ></stopwatch-entry>
              <div class="aw-divider"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="aw-empty flex-1" v-else>No away sessions saved yet.</div>
    </section>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';

import StopwatchEntry from '../components/StopwatchEntry.vue';
import { appQuery, fullDesktopQuery, multideviceQuery } from '~/app/lib/queries';
import { get_day_period } from '~/app/lib/time';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { useSettingsStore } from '~/features/settings/store/settings';
import { useToast } from '~/shared/composables/useToast';

export default {
  name: 'Stopwatch',
  components: {
    'stopwatch-entry': StopwatchEntry,
  },
  data: () => {
    return {
      loading: true,
      bucket_id: 'aw-stopwatch',
      events: [],
      bucketsStore: useBucketsStore(),
      categoryStore: useCategoryStore(),
      settingsStore: useSettingsStore(),
      label: '',
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
    stoppedTimers() {
      return _.orderBy(
        _.filter(this.events, e => !e.data.running),
        e => e.timestamp,
        'desc'
      );
    },
    timersByDate() {
      return _.groupBy(this.stoppedTimers, e => moment(e.timestamp).format('YYYY-MM-DD'));
    },
    elapsedSeconds() {
      if (!this.activeTimer) {
        return 0;
      }
      return Math.max(0, moment(this.now).diff(moment(this.activeTimer.timestamp), 'seconds'));
    },
    canStopTracking() {
      return this.label.trim().length > 0;
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
        background: `conic-gradient(rgb(var(--primary)) ${
          progress * 360
        }deg, rgb(var(--primary-soft)) 0deg)`,
      };
    },
    recentLabels() {
      return _.uniq(
        this.stoppedTimers
          .map(e => e.data.label)
          .filter((label: string) => label && label.trim().length > 0)
      ).slice(0, 6);
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
    async handlePrimaryAction() {
      if (this.activeTimer) {
        await this.resumeTracking();
        return;
      }

      await this.triggerStopTracking();
    },

    async triggerStopTracking(label = this.label) {
      const nextLabel = (label || '').trim();
      if (!nextLabel) {
        const { info } = useToast();
        info('Add a label first', 'Describe what you are about to do before stopping tracking.');
        return;
      }

      await this.startAwaySession(nextLabel);
    },

    async startAwaySession(label = this.label) {
      if (this.activeTimer) {
        const { info } = useToast();
        info(
          'Away session already running',
          'Press Start before beginning another manual session.'
        );
        return;
      }

      const event = {
        timestamp: new Date(),
        data: {
          running: true,
          label,
        },
      };
      await this.$aw.heartbeat(this.bucket_id, 1, event);
      this.label = label;
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
    },

    updateTimer(new_event) {
      const index = this.events.findIndex(e => e.id == new_event.id);
      if (index !== -1) {
        this.events.splice(index, 1, new_event);
      }
    },

    removeTimer(event) {
      this.events = _.filter(this.events, e => e.id != event.id);
    },

    useRecentLabel(label: string) {
      this.label = label || '';
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
      const range = get_day_period(moment(), this.settingsStore.startOfDay);
      const categories = this.categoryStore.queryRules;
      const desktopHosts = this.desktopHosts();

      if (desktopHosts.length > 1) {
        const result = await this.$aw.query(
          [range],
          multideviceQuery({
            hosts: desktopHosts,
            filter_afk: true,
            categories,
            filter_categories: undefined,
            host_params: {},
            always_active_pattern: this.settingsStore.always_active_pattern,
          })
        );
        return Number(result?.[0]?.window?.duration || 0);
      }

      if (desktopHosts.length === 1) {
        const host = desktopHosts[0];
        const result = await this.$aw.query(
          [range],
          fullDesktopQuery({
            bid_window: this.bucketsStore.bucketsWindow(host)[0],
            bid_afk: this.bucketsStore.bucketsAFK(host)[0],
            bid_browsers: this.bucketsStore.bucketsBrowser(host),
            filter_afk: true,
            categories,
            filter_categories: undefined,
            include_audible: true,
            always_active_pattern: this.settingsStore.always_active_pattern,
          })
        );
        return Number(result?.[0]?.window?.duration || 0);
      }

      const androidBuckets = this.androidBuckets();
      if (androidBuckets.length > 0) {
        const result = await this.$aw.query(
          [range],
          appQuery(androidBuckets[0], categories, undefined)
        );
        return Number(result?.[0]?.duration || 0);
      }

      return 0;
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
      this.loading = false;
    },
  },
};
</script>
