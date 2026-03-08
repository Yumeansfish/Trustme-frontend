<template>
<div class="aw-sunburst-clock aw-sunburst-clock-root">
  <div class="aw-sunburst-clock-legend-wrap">
    <div class="aw-sunburst-clock-legend legend"></div>
  </div>
  <div class="aw-sunburst-clock-max">
    <div class="relative chart">
      <div class="aw-sunburst-clock-center explanation text-foreground-muted">
        <div class="text-foreground-subtle aw-display-sm base">{{ centerMsg }}</div>
        <div class="hover invisible">
          <div class="aw-sunburst-overlay-parent date"></div>
          <div class="aw-display-sm text-foreground-strong title font-bold"></div>
          <div class="time"></div>
          <div class="duration"></div>
          <div class="data truncate"></div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script>
import sunburst from '../../lib/sunburst-clock';
import moment from 'moment';
import _ from 'lodash';

export default {
  name: 'aw-sunburst-clock',
  props: {
    date: { type: String },
    afkBucketId: { type: String },
    windowBucketId: { type: String },
  },

  data: () => {
    return {
      starttime: moment(),
      endtime: moment(),
      centerMsg: 'Loading...',
    };
  },

  watch: {
    date: function (to) {
      this.starttime = moment(to);
      this.endtime = moment(this.starttime).add(1, 'days');
      this.visualize();
    },
  },
  mounted: function () {
    sunburst.create(this.$el);
    this.starttime = moment(this.date);
    this.endtime = moment(this.date).add(1, 'days');
    this.visualize();
  },

  methods: {
    todaysEvents: async function (bucket_id) {
      const querystr = [`RETURN = flood(query_bucket("${bucket_id}"));`];
      const data = await this.$aw.query(
        [`${this.starttime.format()}/${this.endtime.format()}`],
        querystr
      );
      return data[0];
    },

    visualize: function () {
      function buildHierarchy(parents, children) {
        parents = _.sortBy(parents, 'timestamp', 'desc');
        children = _.sortBy(children, 'timestamp', 'desc');

        let i_child = 0;
        for (let i_parent = 0; i_parent < parents.length; i_parent++) {
          const p = parents[i_parent];
          const p_start = moment(p.timestamp);
          const p_end = p_start.clone().add(p.duration, 'seconds');

          p.children = [];
          while (i_child < children.length) {
            const e = children[i_child];
            const e_start = moment(e.timestamp);
            const e_end = e_start.clone().add(e.duration, 'seconds');

            const before_parent = e_end.isBefore(p_start);
            const within_parent = e_start.isAfter(p_start) && e_end.isBefore(p_end);
            const after_parent = e_start.isAfter(p_end);

            // TODO: This isn't correct, yet
            if (before_parent) {
              // Child is behind parent
              //console.log("Too far behind: " + i_child);
              i_child++;
            } else if (within_parent) {
              //console.log("Added relation: " + i_child);
              p.children = _.concat(p.children, e);
              i_child++;
            } else if (after_parent) {
              // Child is ahead of parent
              //console.log("Too far ahead: " + i_child);
              break;
            } else {
              // TODO: Split events when this happens
              console.warn('Between parents');
              p.children = _.concat(p.children, e);
              i_child++;
            }
          }
        }

        // Build the root node
        //console.log(parents);
        const m_start = moment(_.first(parents).timestamp);
        const m_end = moment(_.tail(parents).timestamp);
        const duration = (m_end - m_start) / 1000;
        return {
          timestamp: _.first(parents).timestamp,
          // TODO: If we want a 12/24h clock, this has to change
          duration: duration,
          data: { title: 'ROOT' },
          children: parents,
        };
      }

      this.todaysEvents(this.afkBucketId).then(events_afk => {
        this.todaysEvents(this.windowBucketId).then(events_window => {
          let hierarchy = null;
          if (events_afk.length > 0 && events_window.length > 0) {
            hierarchy = buildHierarchy(events_afk, events_window);
            this.centerMsg = 'Hover to inspect';
          } else {
            // FIXME: This should do the equivalent of "No data" when such is the case, but it doesn't.
            hierarchy = {
              timestamp: '',
              // TODO: If we want a 12/24h clock, this has to change
              duration: 0,
              data: { title: 'ROOT' },
              children: [],
            };
            this.centerMsg = 'No data';
          }
          sunburst.update(this.$el, hierarchy);
        });
      });
    },
  },
};
</script>
