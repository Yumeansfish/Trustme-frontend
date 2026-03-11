<template>
<div :class="timelineClasses">
  <div class="mt-2 mb-2 w-full max-w-full overflow-visible box-border" id="visualization"></div>
  <div v-if="editingEvent">
    <EventEditor
      :event="editingEvent"
      :bucket_id="editingEventBucket"
      :open="editorOpen"
      @update:open="onEditorOpenChange"
      @saved="onEventPersisted"
      @deleted="onEventPersisted"
    ></EventEditor>
  </div>
</div>
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';
import Color from 'color';
import { buildTooltip } from '~/shared/lib/tooltip.js';
import {
  getCategoryColorFromEvent,
  getCategoryNameFromEvent,
  getTitleAttr,
} from '~/features/categorization/lib/color';
import { getSwimlane } from '~/shared/lib/swimlane.js';
import { IEvent } from '~/shared/lib/interfaces';
import { useToast } from '~/shared/composables/useToast';

import { Timeline } from 'vis-timeline/esnext';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import EventEditor from '~/features/events/components/EventEditor.vue';
import { ACTIVITY_QUERY_INTERVAL } from '~/features/activity/lib/visualizationTokens';

const TIMELINE_PRODUCTIVE = '#5CC0CA';
const TIMELINE_MISC = '#A8AFBC';
const TIMELINE_WARNING = '#E2A34D';
const PRODUCTIVE_CATEGORIES = new Set([
  'Code',
  'Writing',
  'Research',
  'Planning',
  'Design',
  'Meetings',
  'Email',
]);
const WARNING_CATEGORIES = new Set(['Gaming']);

interface IChartDataItem {
  sourceBucketId: string;
  groupId: string;
  title: string;
  tooltip: string;
  start: Date;
  end: Date;
  color: string;
  event: IEvent;
  swimlane: string;
}
export default {
  emits: ['request-refresh'],
  components: {
    EventEditor,
  },
  props: {
    buckets: { type: Array },
    events: { type: Array },
    showRowLabels: { type: Boolean },
    queriedInterval: { type: Array },
    showQueriedInterval: { type: Boolean },
    swimlane: { type: String },
    updateTimelineWindow: { type: Boolean },
    colorMode: { type: String, default: 'default' },
    lockWindow: { type: Boolean, default: false },
    cardMode: { type: Boolean, default: false },
  },
  data() {
    return {
      timeline: null,
      filterShortEvents: true,
      items: [],
      groups: [],
      options: {
        zoomMin: 1000 * 60, // 10min in milliseconds
        zoomMax: 1000 * 60 * 60 * 24 * 31 * 3, // about three months in milliseconds
        stack: false,
        margin: {
          item: {
            vertical: 8,
          },
        },
        tooltip: {
          followMouse: true,
          overflowMethod: 'none',
          delay: 0,
        },
        moveable: true,
        zoomable: true,
      },
      editingEvent: null,
      editingEventBucket: null,
      editorOpen: false,

      updateHasRun: false,
    };
  },
  computed: {
    bucketsFromEither() {
      if (this.buckets) {
        return this.buckets;
      } else if (this.events) {
        // If buckets not passed, check if events have been passed and generate a bucket from those events
        return [
          {
            id: 'events',
            type: 'search',
            events: this.events,
          },
        ];
      } else {
        console.error('No buckets or events passed to timeline');
        return [];
      }
    },
    chartData(): IChartDataItem[] {
      const data: IChartDataItem[] = [];
      _.each(this.bucketsFromEither, bucket => {
        if (bucket.events === undefined) {
          return;
        }
        let events = bucket.events;
        // Filter out events shorter than 1 second (notably including 0-duration events)
        // TODO: Use flooding instead, preferably with some additional method of removing/simplifying short events for even greater performance
        if (this.filterShortEvents) {
          events = _.filter(events, e => e.duration > 1);
        }
        events.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());
        _.each(events, e => {
          data.push({
            sourceBucketId: bucket.id,
            groupId: bucket.groupId || bucket.id,
            title: this.getItemTitle(bucket, e),
            tooltip: buildTooltip(bucket, e),
            start: new Date(e.timestamp),
            end: new Date(moment(e.timestamp).add(e.duration, 'seconds').valueOf()),
            color: this.getItemColor(bucket, e),
            event: e,
            swimlane: getSwimlane(bucket, e.color, this.swimlane, e),
          });
        });
      });
      return data;
    },
    timelineClasses() {
      return {
        'aw-now-timeline aw-now-timeline-shell': this.colorMode === 'now',
        'aw-now-timeline-card-mode': this.cardMode,
      };
    },
  },
  watch: {
    buckets() {
      // For some reason, an object is passed here, after which the correct array arrives
      if (this.buckets.length === undefined) {
        //console.log("I told you so!")
        return;
      }

      this.update();
    },
    events() {
      if (this.events.length === undefined) {
        return;
      }

      this.update();
    },
  },
  mounted() {
    this.$nextTick(() => {
      const el = this.$el.querySelector('#visualization');
      this.options.moveable = !this.lockWindow;
      this.options.zoomable = !this.lockWindow;
      if (this.colorMode === 'now') {
        this.options.margin = {
          item: {
            vertical: 24,
          },
        };
      }
      this.timeline = new Timeline(el, [], [], this.options);
      this.timeline.on('select', properties => {
        // Sends both 'press' and 'tap' events, only one should trigger
        if (properties.event.type == 'tap') {
          this.onSelect(properties);
        }
      });

      this.ensureUpdate();
    });
  },
  beforeUnmount() {
    if (this.timeline) {
      this.timeline.destroy();
      this.timeline = null;
    }
  },
  methods: {
    onSelect: async function (properties) {
      const { info } = useToast();

      if (properties.items.length == 0) {
        return;
      } else if (properties.items.length == 1) {
        const event = this.chartData[properties.items[0]].event;
        const bucketId = this.items[properties.items[0]].sourceBucketId;

        // We retrieve the full event to ensure if's not cut-off by the query range
        // See: https://github.com/ActivityWatch/aw-webui/pull/320#issuecomment-1056921587
        this.editingEvent = await this.$aw.getEvent(bucketId, event.id);
        this.editingEventBucket = bucketId;
        this.editorOpen = true;
      } else {
        info('Multiple selection', `Selected ${properties.items.length} timeline items.`);
      }
    },
    onEditorOpenChange(open) {
      this.editorOpen = open;
      if (!open) {
        this.editingEvent = null;
        this.editingEventBucket = null;
      }
    },
    onEventPersisted() {
      this.$emit('request-refresh');
    },
    ensureUpdate() {
      // Will only run update() if data available and never ran before
      if (!this.updateHasRun) {
        this.update();
      }
    },
    update() {
      // Used by unsureUpdate to check if ran
      this.updateHasRun = true;

      // Build groups
      const buckets = this.bucketsFromEither;
      let groups = _.uniqBy(
        _.map(buckets, bucket => {
          const groupId = bucket.groupId || bucket.id || 'events';
          const groupLabel = bucket.groupLabel || bucket.id || 'events';
          return {
            id: groupId,
            content: this.showRowLabels ? groupLabel : '',
          };
        }),
        'id'
      );

      // Build items
      const items = _.map(this.chartData, (item, i) => {
        const bgColor = item.color;
        const borderColor = Color(bgColor).darken(0.3);
        return {
          id: String(i),
          group: item.groupId,
          content: item.title,
          title: item.tooltip,
          start: moment(item.start),
          end: moment(item.end),
          style: `background-color: ${bgColor}; border-color: ${borderColor}`,
          subgroup: item.swimlane,
          sourceBucketId: item.sourceBucketId,
        };
      });

      if (groups.length > 0 && items.length > 0) {
        if (this.queriedInterval && this.showQueriedInterval) {
          const duration = this.queriedInterval[1].diff(this.queriedInterval[0], 'seconds');
          groups.push({ id: String(groups.length), content: 'queried interval' });
          items.push({
            id: String(items.length + 1),
            group: groups.length - 1,
            title: buildTooltip(
              { type: 'test' },
              {
                timestamp: this.queriedInterval[0],
                duration: duration,
                data: { title: 'test' },
              }
            ),
            content: 'query',
            start: this.queriedInterval[0],
            end: this.queriedInterval[1],
            style: `background-color: ${ACTIVITY_QUERY_INTERVAL}; height: 10px`,
            subgroup: ``,
          });
        }

        if (this.updateTimelineWindow) {
          const start =
            (this.queriedInterval && this.queriedInterval[0]) ||
            _.min(_.map(items, item => item.start));
          const end =
            (this.queriedInterval && this.queriedInterval[1]) ||
            _.max(_.map(items, item => item.end));
          this.options.min = start;
          this.options.max = end;
          this.timeline.setOptions(this.options);
          this.timeline.setWindow(start, end);
        }

        // Hide buckets with no events in the queried range
        const count = _.countBy(items, i => i.group);
        groups = _.filter(groups, g => {
          return count[g.id] && count[g.id] > 0;
        });
        this.timeline.setData({ groups: groups, items: items });

        this.items = items;
        this.groups = groups;
      } else {
        // update the timeline range
        this.options.min = this.queriedInterval[0];
        this.options.max = this.queriedInterval[1];
        this.timeline.setOptions(this.options);
        this.timeline.setWindow(this.queriedInterval[0], this.queriedInterval[1]);

        // clear the data
        this.timeline.setData({ groups: [], items: [] });
        this.items = [];
        this.groups = [];
      }
    },
    getItemTitle(bucket, event) {
      if (this.colorMode === 'now' && bucket.type === 'afkstatus') {
        return event.data.status === 'not-afk' ? 'Active' : 'Idle';
      }

      return getTitleAttr(bucket, event);
    },
    getItemColor(bucket, event) {
      if (this.colorMode !== 'now') {
        return getCategoryColorFromEvent(bucket, event);
      }

      if (bucket.type === 'afkstatus') {
        return event.data.status === 'not-afk' ? TIMELINE_PRODUCTIVE : TIMELINE_MISC;
      }

      const categoryName = getCategoryNameFromEvent(bucket, event);
      if (categoryName && WARNING_CATEGORIES.has(categoryName)) {
        return TIMELINE_WARNING;
      }

      if (categoryName && PRODUCTIVE_CATEGORIES.has(categoryName)) {
        return TIMELINE_PRODUCTIVE;
      }

      return TIMELINE_MISC;
    },
  },
};
</script>
