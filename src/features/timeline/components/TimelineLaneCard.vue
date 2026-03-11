<template>
  <article class="aw-shortcut-card aw-live-lane-card cursor-default gap-4 p-5 md:p-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-start gap-4">
        <span class="aw-shortcut-card-icon shrink-0">
          <icon :name="icon" class="h-5 w-5"></icon>
        </span>
        <div class="space-y-1">
          <h3 class="text-foreground-strong text-xl font-semibold md:text-2xl">{{ title }}</h3>
          <p
            v-if="description"
            class="text-foreground-muted text-base leading-7"
          >
            {{ description }}
          </p>
        </div>
      </div>
      <div class="aw-chip">{{ eventCount }} events</div>
    </div>

    <div
      v-if="segments.length === 0"
      class="aw-card-muted py-6 text-center text-base text-foreground-muted"
    >
      {{ emptyMessage }}
    </div>

    <div v-else class="aw-live-lane-body">
      <div class="aw-live-lane-track">
        <div
          v-for="tick in tickMarks"
          :key="tick.key"
          class="aw-live-lane-grid-line"
          :style="{ left: `${tick.leftPct}%` }"
        ></div>

        <button
          v-for="segment in segments"
          :key="segment.key"
          type="button"
          class="aw-live-lane-segment"
          :class="[
            `aw-live-lane-segment-${segment.variant}`,
            { 'aw-live-lane-segment-compact': !segment.showLabel },
          ]"
          :style="segmentStyle(segment)"
          @mouseenter="showTooltip($event, segment)"
          @mousemove="moveTooltip"
          @mouseleave="hideTooltip"
          @click="openEditor(segment)"
        >
          <span v-if="segment.showLabel" class="aw-live-lane-segment-label">{{ segment.label }}</span>
        </button>
      </div>

      <div class="aw-live-lane-axis">
        <div
          v-for="tick in axisTickMarks"
          :key="`${tick.key}-label`"
          class="aw-live-lane-axis-item"
          :class="{
            'aw-live-lane-axis-item-start': tick.edge === 'start',
            'aw-live-lane-axis-item-end': tick.edge === 'end',
          }"
          :style="{ left: `${tick.leftPct}%` }"
        >
          {{ tick.label }}
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="hoveredSegment"
        ref="tooltipCard"
        class="aw-live-tooltip"
        :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
      >
        <div class="aw-live-tooltip-top">
          <div class="aw-live-tooltip-date">{{ hoveredSegment.dateLabel }}</div>
          <div class="aw-live-tooltip-pill">{{ hoveredSegment.durationLabel }}</div>
        </div>
        <div class="aw-live-tooltip-body">
          <div class="aw-live-tooltip-range">{{ hoveredSegment.rangeLabel }}</div>
          <div class="aw-live-tooltip-grid">
            <div
              v-for="field in hoveredSegment.fields"
              :key="`${hoveredSegment.key}-${field.label}`"
              class="aw-live-tooltip-field"
              :class="{ 'aw-live-tooltip-field-wide': field.wide }"
            >
              <div class="aw-live-tooltip-field-label">{{ field.label }}</div>
              <div class="aw-live-tooltip-field-value">{{ field.value }}</div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <EventEditor
      v-if="editingEvent"
      :event="editingEvent"
      :bucket_id="editingBucketId"
      :open="editorOpen"
      @update:open="onEditorOpenChange"
      @saved="onEventPersisted"
      @deleted="onEventPersisted"
    ></EventEditor>
  </article>
</template>

<script lang="ts">
import moment from 'moment';
import { defineComponent } from 'vue';

import { seconds_to_duration } from '~/app/lib/time';
import {
  getCategoryNameFromEvent,
  getTitleAttr,
} from '~/features/categorization/lib/color';
import EventEditor from '~/features/events/components/EventEditor.vue';

const TOOLTIP_OFFSET = 16;
const TOOLTIP_FALLBACK_WIDTH = 240;
const TOOLTIP_FALLBACK_HEIGHT = 176;
const TICK_INTERVAL_MINUTES = 5;

function uniqSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b);
}

export default defineComponent({
  name: 'TimelineLaneCard',
  components: {
    EventEditor,
  },
  props: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    laneType: { type: String, required: true },
    buckets: {
      type: Array,
      default: () => [],
    },
    daterange: {
      type: Array,
      default: () => [],
    },
    emptyMessage: {
      type: String,
      default: 'No recent activity.',
    },
  },
  emits: ['request-refresh'],
  data() {
    return {
      hoveredSegment: null as any,
      tooltipX: 0,
      tooltipY: 0,
      editingEvent: null as any,
      editingBucketId: '',
      editorOpen: false,
    };
  },
  computed: {
    rangeStartMs() {
      return this.daterange?.[0] ? moment(this.daterange[0]).valueOf() : null;
    },
    rangeEndMs() {
      return this.daterange?.[1] ? moment(this.daterange[1]).valueOf() : null;
    },
    rangeDurationMs() {
      if (this.rangeStartMs == null || this.rangeEndMs == null) {
        return 0;
      }
      return Math.max(this.rangeEndMs - this.rangeStartMs, 1);
    },
    normalizedEvents() {
      if (this.rangeStartMs == null || this.rangeEndMs == null) {
        return [];
      }

      return this.buckets.flatMap((bucket: any) =>
        (bucket.events || [])
          .map((event: any) => this.normalizeEvent(bucket, event))
          .filter(Boolean)
      );
    },
    eventCount() {
      return this.normalizedEvents.length;
    },
    axisTickMarks() {
      return this.tickMarks.filter((tick: any) => tick.showLabel !== false);
    },
    segments() {
      if (!this.normalizedEvents.length || !this.rangeDurationMs) {
        return [];
      }

      const boundaries = uniqSorted([
        this.rangeStartMs,
        this.rangeEndMs,
        ...this.normalizedEvents.flatMap((item: any) => [item.startMs, item.endMs]),
      ]);

      const intervals: any[] = [];
      for (let index = 0; index < boundaries.length - 1; index += 1) {
        const startMs = boundaries[index];
        const endMs = boundaries[index + 1];
        if (endMs <= startMs) {
          continue;
        }

        const activeItems = this.normalizedEvents
          .filter((item: any) => item.startMs < endMs && item.endMs > startMs)
          .sort(this.compareEvents);

        if (!activeItems.length) {
          continue;
        }

        const chosen = activeItems[0];
        const previous = intervals[intervals.length - 1];
        if (
          previous &&
          previous.signature === chosen.signature &&
          previous.label === chosen.label &&
          previous.variant === chosen.variant &&
          previous.detail === chosen.detail &&
          previous.endMs === startMs
        ) {
          previous.endMs = endMs;
          continue;
        }

        intervals.push({
          ...chosen,
          startMs,
          endMs,
        });
      }

      return intervals.map((segment: any) => this.decorateSegment(segment));
    },
    tickMarks() {
      if (this.rangeStartMs == null || this.rangeEndMs == null || !this.rangeDurationMs) {
        return [];
      }

      const ticks: Array<{
        key: string;
        label: string;
        leftPct: number;
        timeMs: number;
        edge?: string;
        showLabel?: boolean;
      }> = [
        {
          key: 'start',
          label: moment(this.rangeStartMs).format('HH:mm'),
          leftPct: 0,
          timeMs: this.rangeStartMs,
          edge: 'start',
          showLabel: true,
        },
      ];
      const internalTicks: Array<{
        key: string;
        label: string;
        leftPct: number;
        timeMs: number;
      }> = [];

      const cursor = moment(this.rangeStartMs).startOf('minute');
      const minuteRemainder = cursor.minute() % TICK_INTERVAL_MINUTES;
      if (minuteRemainder !== 0) {
        cursor.add(TICK_INTERVAL_MINUTES - minuteRemainder, 'minutes');
      }
      if (cursor.valueOf() <= this.rangeStartMs) {
        cursor.add(TICK_INTERVAL_MINUTES, 'minutes');
      }

      const firstTickGapMinutes =
        (cursor.valueOf() - this.rangeStartMs) / (1000 * 60);
      if (firstTickGapMinutes < TICK_INTERVAL_MINUTES / 2) {
        cursor.add(TICK_INTERVAL_MINUTES, 'minutes');
      }

      while (cursor.valueOf() < this.rangeEndMs) {
        internalTicks.push({
          key: cursor.toISOString(),
          label: cursor.format('HH:mm'),
          leftPct: ((cursor.valueOf() - this.rangeStartMs) / this.rangeDurationMs) * 100,
          timeMs: cursor.valueOf(),
        });
        cursor.add(TICK_INTERVAL_MINUTES, 'minutes');
      }

      const labelStep = Math.max(1, Math.ceil(internalTicks.length / 4));
      internalTicks.forEach((tick, index) => {
        ticks.push({
          ...tick,
          showLabel: index % labelStep === 0,
        });
      });

      ticks.push({
        key: 'end',
        label: moment(this.rangeEndMs).format('HH:mm'),
        leftPct: 100,
        timeMs: this.rangeEndMs,
        edge: 'end',
        showLabel: true,
      });

      const minEdgeGapMs = (TICK_INTERVAL_MINUTES / 2) * 60 * 1000;
      for (let index = 1; index < ticks.length - 1; index += 1) {
        const tick = ticks[index];
        if (tick.showLabel === false) {
          continue;
        }

        const previous = ticks
          .slice(0, index)
          .reverse()
          .find(candidate => candidate.showLabel !== false);
        const next = ticks
          .slice(index + 1)
          .find(candidate => candidate.showLabel !== false);

        const tooCloseToPrevious =
          previous != null && tick.timeMs - previous.timeMs < minEdgeGapMs;
        const tooCloseToNext =
          next != null && next.timeMs - tick.timeMs < minEdgeGapMs;

        if (tooCloseToPrevious || tooCloseToNext) {
          tick.showLabel = false;
        }
      }

      return ticks;
    },
  },
  methods: {
    compareEvents(a: any, b: any) {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const startDiff = b.startMs - a.startMs;
      if (startDiff !== 0) {
        return startDiff;
      }

      return b.endMs - b.startMs - (a.endMs - a.startMs);
    },
    getTypePriority(bucket: any) {
      if (bucket.type?.startsWith('general.stopwatch')) {
        return 6;
      }
      if (bucket.type === 'web.tab.current') {
        return 5;
      }
      if (bucket.type?.startsWith('app.editor')) {
        return 4;
      }
      if (bucket.id?.startsWith('aw-watcher-android')) {
        return 3;
      }
      if (bucket.type === 'currentwindow') {
        return 2;
      }
      if (bucket.type === 'afkstatus') {
        return 1;
      }
      return 0;
    },
    getSourceLabel(bucket: any) {
      if (bucket.type === 'afkstatus') {
        return 'Status';
      }
      if (bucket.type === 'web.tab.current') {
        return 'Browser';
      }
      if (bucket.type?.startsWith('app.editor')) {
        return 'Editor';
      }
      if (bucket.type?.startsWith('general.stopwatch')) {
        return 'Manual';
      }
      if (bucket.id?.startsWith('aw-watcher-android')) {
        return 'Android';
      }
      return 'Window';
    },
    getEventLabel(bucket: any, event: any) {
      if (this.laneType === 'status') {
        return event.data?.status === 'not-afk' ? 'Active' : 'Idle';
      }

      if (bucket.type?.startsWith('general.stopwatch')) {
        return event.data?.label || 'Manual Session';
      }

      return event.data?.app || getTitleAttr(bucket, event) || 'Activity';
    },
    getEventDetail(bucket: any, event: any, fallbackLabel: string) {
      if (this.laneType === 'status') {
        return fallbackLabel;
      }

      if (bucket.type === 'web.tab.current') {
        return event.data?.title || event.data?.url || fallbackLabel;
      }
      if (bucket.type?.startsWith('app.editor')) {
        return event.data?.file || event.data?.project || fallbackLabel;
      }
      if (bucket.type?.startsWith('general.stopwatch')) {
        return event.data?.label || fallbackLabel;
      }
      return event.data?.title || fallbackLabel;
    },
    getEventCategory(bucket: any, event: any) {
      if (this.laneType === 'status') {
        return null;
      }
      return getCategoryNameFromEvent(bucket, event);
    },
    getSegmentVariant(bucket: any, event: any) {
      if (this.laneType === 'status') {
        return event.data?.status === 'not-afk' ? 'primary' : 'soft';
      }

      return 'primary';
    },
    normalizeEvent(bucket: any, event: any) {
      const rawStartMs = moment(event.timestamp).valueOf();
      const rawEndMs = rawStartMs + Number(event.duration || 0) * 1000;
      const startMs = Math.max(rawStartMs, this.rangeStartMs);
      const endMs = Math.min(rawEndMs, this.rangeEndMs);
      if (!(endMs > startMs)) {
        return null;
      }

      const label = this.getEventLabel(bucket, event);
      const detail = this.getEventDetail(bucket, event, label);
      const category = this.getEventCategory(bucket, event);
      const variant = this.getSegmentVariant(bucket, event);

      return {
        key: `${bucket.id}:${event.id ?? event.timestamp}:${rawStartMs}`,
        signature:
          this.laneType === 'status'
            ? `${variant}:${label}`
            : `${bucket.id}:${event.id ?? event.timestamp}:${label}`,
        bucketId: bucket.id,
        bucketType: bucket.type,
        priority: this.getTypePriority(bucket),
        event,
        label,
        detail,
        category,
        source: this.getSourceLabel(bucket),
        startMs,
        endMs,
        variant,
      };
    },
    decorateSegment(segment: any) {
      const leftPct = ((segment.startMs - this.rangeStartMs) / this.rangeDurationMs) * 100;
      const widthPct = ((segment.endMs - segment.startMs) / this.rangeDurationMs) * 100;
      const dateLabel = moment(segment.startMs).format('ddd D MMM');
      const durationLabel = seconds_to_duration((segment.endMs - segment.startMs) / 1000);
      const rangeLabel = `${moment(segment.startMs).format('HH:mm:ss')} - ${moment(
        segment.endMs
      ).format('HH:mm:ss')}`;
      const fields =
        this.laneType === 'status'
          ? [
              { label: 'State', value: segment.label },
              { label: 'Source', value: segment.source },
            ]
          : [
              { label: 'App', value: segment.label },
              ...(segment.category ? [{ label: 'Category', value: segment.category }] : []),
              { label: 'Source', value: segment.source },
              ...(segment.detail && segment.detail !== segment.label
                ? [{ label: 'Detail', value: segment.detail, wide: true }]
                : []),
            ];

      return {
        ...segment,
        leftPct,
        widthPct,
        dateLabel,
        durationLabel,
        rangeLabel,
        fields,
        showLabel: widthPct >= (this.laneType === 'status' ? 5 : 7),
      };
    },
    segmentStyle(segment: any) {
      return {
        left: `${segment.leftPct}%`,
        width: `${Math.max(segment.widthPct, 0.65)}%`,
      };
    },
    showTooltip(event: MouseEvent, segment: any) {
      this.hoveredSegment = segment;
      this.moveTooltip(event);
      this.$nextTick(() => this.moveTooltip(event));
    },
    moveTooltip(event: MouseEvent) {
      const tooltipEl = this.$refs.tooltipCard as HTMLElement | undefined;
      const tooltipWidth = tooltipEl?.offsetWidth || TOOLTIP_FALLBACK_WIDTH;
      const tooltipHeight = tooltipEl?.offsetHeight || TOOLTIP_FALLBACK_HEIGHT;
      const maxX = Math.max(8, window.innerWidth - tooltipWidth - 8);
      const maxY = Math.max(8, window.innerHeight - tooltipHeight - 8);
      this.tooltipX = Math.min(event.clientX + TOOLTIP_OFFSET, maxX);
      this.tooltipY = Math.min(event.clientY + TOOLTIP_OFFSET, maxY);
    },
    hideTooltip() {
      this.hoveredSegment = null;
    },
    openEditor(segment: any) {
      if (!segment?.event?.id) {
        return;
      }

      this.editingEvent = segment.event;
      this.editingBucketId = segment.bucketId;
      this.editorOpen = true;
    },
    onEditorOpenChange(open: boolean) {
      this.editorOpen = open;
      if (!open) {
        this.editingEvent = null;
        this.editingBucketId = '';
      }
    },
    onEventPersisted() {
      this.$emit('request-refresh');
    },
  },
});
</script>
