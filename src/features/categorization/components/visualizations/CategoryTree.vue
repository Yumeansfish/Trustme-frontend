<template>
<div class="space-y-2 text-sm">
  <div class="text-foreground flex items-center justify-between gap-3 rounded-md px-2 py-1 transition" v-for="cat in category_hierarchy" v-if="parents_expanded(cat)" @click="toggle(cat)" :class="cat.children.length > 0 ? 'cursor-pointer hover:bg-surface-muted' : ''">
    <div class="flex min-w-0 items-center gap-2" :class="indentClass(cat.depth)"><span class="text-foreground-muted" v-if="cat.children.length > 0">
        <icon class="h-3.5 w-3.5" v-if="!expanded.has(cat.name_pretty)" name="regular/plus-square" scale="0.8"></icon>
        <icon class="h-3.5 w-3.5" v-else name="regular/minus-square" scale="0.8"></icon></span><span class="text-foreground-subtle" v-else>
        <icon class="h-3 w-3" name="circle" scale="0.4"></icon></span><span class="truncate">{{ cat.subname }}</span></div><span class="text-foreground-muted shrink-0"><span v-if="show_perc">{{ Math.round(100 * cat.duration / total_duration, 1) }}%</span><span v-else>{{ friendlyduration(cat.duration) }}</span></span>
  </div>
  <div class="aw-divider"></div>
  <label class="text-foreground inline-flex items-center gap-2 text-sm">
    <ui-checkbox class="aw-checkbox" v-model="show_perc"  /><span>Show percent</span>
  </label>
</div>
</template>

<script lang="ts">
import _ from 'lodash';
import {
  build_category_hierarchy,
  flatten_category_hierarchy,
} from '~/features/categorization/lib/classes.ts';
import { IEvent } from '~/shared/lib/interfaces.ts';

function _get_child_cats(cat, all_cats) {
  return _.filter(all_cats, c => _.isEqual(c.parent, cat.name));
}

function _assign_children(parent, all_cats) {
  const child_cats = _get_child_cats(parent, all_cats);
  // Recurse
  _.map(child_cats, c => _assign_children(c, all_cats));
  parent.children = _.sortBy(child_cats, cc => -cc.duration);
}

// Flattens the category hierarchy
function _flatten_hierarchy(c) {
  if (!c.children) return [];
  return _.flattenDeep([c, _.map(c.children, cc => _flatten_hierarchy(cc))]);
}

export default {
  name: 'aw-categorytree',
  props: {
    events: { type: Array },
  },
  data: function () {
    return {
      expanded: new Set(),
      show_perc: false,
    };
  },
  computed: {
    total_duration: function () {
      // sum top-level categories
      const top_c = _.filter(this.category_hierarchy, c => c.depth == 0);
      return _.sumBy(top_c, c => c.duration);
    },
    category_hierarchy: function () {
      if (!this.events) return [];
      const events: IEvent[] = JSON.parse(JSON.stringify(this.events)) as IEvent[];

      const hier = build_category_hierarchy(
        _.map(events, e => {
          return { name: e.data['$category'], rule: { type: 'none' } };
        })
      );

      let cats = flatten_category_hierarchy(hier).map(c => {
        c['duration'] = _.sumBy(
          events.filter(e => {
            const pcat = e.data['$category'].slice(0, c.name.length);
            return _.isEqual(c.name, pcat);
          }),
          e => e.duration
        );
        return c;
      });

      const cats_with_depth0 = _.sortBy(
        _.filter(cats, c => c.depth == 0),
        c => -c['duration']
      );
      _.map(cats_with_depth0, c => _assign_children(c, cats));

      cats = _.flatten(_.map(cats_with_depth0, c => _flatten_hierarchy(c)));
      //console.log(cats);
      // TODO: If a category has children, but also activity attributed directly to the parent that does not belong to a child, then create a "Other" child containing the activity.
      return cats;
    },
  },
  methods: {
    indentClass(depth) {
      const classes = [
        'pl-0',
        'pl-6',
        'pl-11',
        'pl-16',
        'pl-20',
        'pl-24',
        'pl-28',
        'pl-32',
      ];
      return classes[Math.min(depth, classes.length - 1)];
    },
    get_category: function (cat_arr) {
      return _.find(this.category_hierarchy, c => _.isEqual(c.name, cat_arr));
    },
    toggle: function (cat) {
      if (this.expanded.has(cat.name_pretty)) {
        this.expanded.delete(cat.name_pretty);
      } else {
        this.expanded.add(cat.name_pretty);
      }
      // needed to trigger update, since Set isn't reactive in Vue 2
      this.expanded = new Set(this.expanded);
    },
    parents_expanded: function (cat) {
      if (cat === undefined || !cat.parent) {
        // top-level category
        return true;
      }
      return (
        // Check grandparents recursively
        this.parents_expanded(this.get_category(cat.parent)) &&
        // Check parent
        this.expanded.has(cat.parent.join('>'))
      );
    },
  },
};
</script>
