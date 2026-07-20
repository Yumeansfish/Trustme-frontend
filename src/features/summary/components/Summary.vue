<template>
  <div class="aw-summary-container min-h-0 flex-1">
    <div class="aw-summary-list">
      <div v-if="entries.length === 0" class="aw-summary-empty">
        {{ fields ? 'No data with duration' : 'Loading...' }}
      </div>
      <div
        v-for="entry in entries"
        v-else
        :key="entry.name"
        class="aw-row"
        :class="{
          'aw-row-active': selectedName === entry.name,
          'aw-row-interactive': Boolean(selectfunc || entry.link),
        }"
        :title="entry.hovertext"
      >
        <button
          class="aw-row-main"
          type="button"
          :disabled="!selectfunc && !entry.link"
          @click="activateEntry(entry)"
        >
          <span class="aw-row-pct">{{ entry.percentage > 0 ? `${entry.percentage}%` : '<1%' }}</span>
          <span class="aw-row-bar-wrap">
            <span class="aw-row-bar-fill block" :style="{ width: `${entry.barWidth}%` }"></span>
          </span>
          <span class="aw-row-name">{{ entry.name }}</span>
          <span class="aw-row-duration">{{ formatDuration(entry.event.duration) }}</span>
        </button>
        <button
          v-if="editfunc && (!editvisiblefunc || editvisiblefunc(entry.event))"
          class="aw-row-edit"
          type="button"
          :aria-label="`Edit ${entry.name}`"
          @click.stop="editfunc(entry.event)"
        >
          <icon name="edit" :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { IEvent } from '~/shared/lib/interfaces';

type EventLabelFunction = (event: IEvent) => string;
type EventAction = (event: IEvent) => void;
type EventPredicate = (event: IEvent) => boolean;

interface SummaryEntry {
  event: IEvent;
  name: string;
  hovertext: string;
  link: string | null;
  percentage: number;
  barWidth: number;
}

const props = withDefaults(
  defineProps<{
    fields?: IEvent[] | null;
    namefunc: EventLabelFunction;
    hoverfunc?: EventLabelFunction | null;
    linkfunc?: ((event: IEvent) => string | null) | null;
    selectfunc?: EventAction | null;
    editfunc?: EventAction | null;
    editvisiblefunc?: EventPredicate | null;
    selectedName?: string | null;
  }>(),
  {
    fields: null,
    hoverfunc: null,
    linkfunc: null,
    selectfunc: null,
    editfunc: null,
    editvisiblefunc: null,
    selectedName: null,
  }
);

const entries = computed<SummaryEntry[]>(() => {
  const events = (props.fields || []).filter(event => event.duration > 0);
  const total = events.reduce((sum, event) => sum + event.duration, 0);
  const longest = events[0]?.duration || 0;

  return events.map(event => ({
    event,
    name: props.namefunc(event),
    hovertext: (props.hoverfunc || props.namefunc)(event),
    link: props.linkfunc?.(event) || null,
    percentage: total > 0 ? Math.round((event.duration / total) * 100) : 0,
    barWidth: longest > 0 ? (event.duration / longest) * 100 : 0,
  }));
});

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function activateEntry(entry: SummaryEntry): void {
  if (props.selectfunc) {
    props.selectfunc(entry.event);
  } else if (entry.link) {
    window.location.assign(entry.link);
  }
}
</script>
