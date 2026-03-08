<template>
<!-- We want to use another colorscheme than the default 'schemeAccent',-->
<!-- unfortunately it seems like the color-scheme prop is broken.-->
<!-- See this issue: https://github.com/David-Desmaisons/Vue.D3.sunburst/issues/11-->
<sunburst :data="data" :colorScale="colorfunc" :getCategoryForColor="categoryForColor" :colorScheme="null" :showLabels="true">
  <!-- Add behaviors-->
  <template slot-scope="{ on, actions }">
    <highlightOnHover v-bind="{ on, actions }"></highlightOnHover>
    <zoomOnClick v-bind="{ on, actions }"></zoomOnClick>
  </template>
  <!-- Add information to be displayed on top of the graph-->
  <div slot="top" slot-scope="{ nodes }">
    <!--nodeInfoDisplayer(:current="nodes.mouseOver" :root="nodes.root" description="time spent" :show-all-number="false")-->
    <div class="aw-sunburst-overlay">
      <div v-if="nodes.mouseOver !== null && nodes.mouseOver">
        <div class="aw-sunburst-overlay-parent">{{ nodes.mouseOver.data.parent ? nodes.mouseOver.data.parent.join(" > ") : " " }}</div>
        <div class="aw-sunburst-overlay-title">{{ nodes.mouseOver.data.name }}</div>
        <div>{{ friendlyduration(nodes.mouseOver.value ) }}</div>
        <div>({{ Math.round(100 * nodes.mouseOver.value / nodes.root.value) }}%)</div>
      </div>
    </div>
  </div>
  <!-- Add legend-->
  <!--breadcrumbTrail(slot="legend" slot-scope="{ nodes, colorGetter, width }" :current="nodes.mouseOver" :root="nodes.root" :colorGetter="colorGetter" :from="nodes.clicked" :width="width" :item-width="100" :order="0")-->
</sunburst>
</template>

<script lang="ts">
import {
  breadcrumbTrail,
  highlightOnHover,
  nodeInfoDisplayer,
  sunburst,
  zoomOnClick,
} from 'vue-d3-sunburst';
import 'vue-d3-sunburst/dist/vue-d3-sunburst.css';
import { getColorFromCategory } from '~/features/categorization/lib/color';
import { SUNBURST_ROOT_DARK, SUNBURST_ROOT_LIGHT } from '~/features/categorization/lib/visualizationTokens';

import { useCategoryStore } from '~/features/categorization/store/categories';
import { useSettingsStore } from '~/features/settings/store/settings';

const example_data = {
  name: 'flare',
  children: [
    {
      name: 'analytics',
      children: [
        {
          name: 'cluster',
          children: [
            { name: 'AgglomerativeCluster', size: 3938 },
            { name: 'CommunityStructure', size: 3812 },
            { name: 'HierarchicalCluster', size: 6714 },
            { name: 'MergeEdge', size: 743 },
          ],
        },
        {
          name: 'optimization',
          children: [{ name: 'AspectRatioBanker', size: 7074 }],
        },
      ],
    },
  ],
};

const SEP = '>';

export default {
  components: {
    breadcrumbTrail,
    highlightOnHover,
    nodeInfoDisplayer,
    sunburst,
    zoomOnClick,
  },
  props: {
    data: {
      type: Object,
      default: () => example_data,
    },
  },
  methods: {
    categoryForColor: function (d) {
      const category = d.parent ? d.parent.concat([d.name]) : [d.name];
      return category.join(SEP);
    },
    colorfunc: function (s) {
      // 'All' needs to be bright if light theme, and dark if dark theme
      const settings = useSettingsStore();
      if (s == 'All') return settings.theme == 'light' ? SUNBURST_ROOT_LIGHT : SUNBURST_ROOT_DARK;

      const categoryStore = useCategoryStore();
      const cat = categoryStore.get_category(s.split(SEP));
      const color = getColorFromCategory(cat, categoryStore.classes);
      return color;
    },
  },
};
</script>
