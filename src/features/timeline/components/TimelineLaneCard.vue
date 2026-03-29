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
      v-if="decoratedSegments.length === 0"
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

        <div
          v-for="segment in decoratedSegments"
          :key="segment.key"
          class="aw-live-lane-segment"
          :class="[
            `aw-live-lane-segment-${segment.variant}`,
            {
              'aw-live-lane-segment-compact': !segment.showLabel,
              'aw-live-lane-segment-clipped-start': segment.clipped_start,
              'aw-live-lane-segment-clipped-end': segment.clipped_end,
            },
          ]"
          :style="segmentStyle(segment)"
          @mouseenter="showTooltip($event, segment)"
          @mousemove="moveTooltip"
          @mouseleave="hideTooltip"
        >
          <span v-if="segment.showLabel" class="aw-live-lane-segment-label">{{ segment.label }}</span>
        </div>
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
        class="aw-live-tooltip aw-timeline-hover-card"
        :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
      >
        <div class="aw-timeline-hover-card-top">
          <div class="aw-timeline-hover-card-date">{{ hoveredSegment.dateLabel }}</div>
          <div class="aw-timeline-hover-card-total">{{ hoveredSegment.durationLabel }}</div>
        </div>
        <div class="aw-timeline-hover-card-body">
          <div class="aw-timeline-hover-card-section-title">{{ hoveredSegment.rangeLabel }}</div>
          <div class="space-y-2">
            <div
              v-for="field in hoveredSegment.fields"
              :key="`${hoveredSegment.key}-${field.label}`"
              class="aw-timeline-hover-row"
            >
              <div class="aw-timeline-hover-row-name">{{ field.label }}</div>
              <div class="aw-timeline-hover-row-duration">{{ field.value }}</div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </article>
</template>

<script lang="ts">
import moment from 'moment';
import { defineComponent } from 'vue';

import {
  buildTimelineLaneSegmentStyle,
  buildTimelineLaneTickMarks,
  buildTimelineTooltipPosition,
  decorateTimelineSegments,
  type TimelineDecoratedSegment,
  type TimelineTickMark,
} from '~/features/timeline/lib/timelineLaneCardState';
import type { TimelineSegment } from '~/shared/contracts/activity.generated';

export default defineComponent({
  name: 'TimelineLaneCard',
  props: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    laneType: { type: String, required: true },
    segments: {
      type: Array,
      default: () => [],
    },
    eventCount: { type: Number, default: 0 },
    daterange: {
      type: Array,
      default: () => [],
    },
    emptyMessage: {
      type: String,
      default: 'No recent activity.',
    },
  },
  data() {
    return {
      hoveredSegment: null as TimelineDecoratedSegment | null,
      tooltipX: 0,
      tooltipY: 0,
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
    axisTickMarks() {
      return this.tickMarks.filter((tick: TimelineTickMark) => tick.showLabel !== false);
    },
    decoratedSegments() {
      return decorateTimelineSegments(this.$props.segments as TimelineSegment[], {
        laneType: this.laneType,
        rangeStartMs: this.rangeStartMs,
        rangeEndMs: this.rangeEndMs,
      });
    },
    tickMarks() {
      return buildTimelineLaneTickMarks({
        rangeStartMs: this.rangeStartMs,
        rangeEndMs: this.rangeEndMs,
        rangeDurationMs: this.rangeDurationMs,
      });
    },
  },
  methods: {
    segmentStyle(segment: TimelineDecoratedSegment) {
      return buildTimelineLaneSegmentStyle(segment);
    },
    showTooltip(event: MouseEvent, segment: TimelineDecoratedSegment) {
      this.hoveredSegment = segment;
      this.moveTooltip(event);
      this.$nextTick(() => this.moveTooltip(event));
    },
    moveTooltip(event: MouseEvent) {
      const tooltipEl = this.$refs.tooltipCard as HTMLElement | undefined;
      const { tooltipX, tooltipY } = buildTimelineTooltipPosition({
        clientX: event.clientX,
        clientY: event.clientY,
        tooltipWidth: tooltipEl?.offsetWidth,
        tooltipHeight: tooltipEl?.offsetHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
      this.tooltipX = tooltipX;
      this.tooltipY = tooltipY;
    },
    hideTooltip() {
      this.hoveredSegment = null;
    },
  },
});
</script>
