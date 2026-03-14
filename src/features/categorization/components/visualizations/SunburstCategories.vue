<template>
  <div class="aw-sunburst-fallback">
    <div class="aw-sunburst-overlay">
      <div class="aw-sunburst-overlay-parent">Category overview</div>
      <div class="aw-sunburst-overlay-title">Sunburst unavailable</div>
      <div class="text-sm text-foreground-subtle">
        This visualization is temporarily simplified for the packaged desktop build.
      </div>
    </div>

    <div class="aw-sunburst-list">
      <div
        v-for="entry in flattenedEntries"
        :key="entry.path"
        class="aw-sunburst-list-item"
      >
        <div class="aw-sunburst-list-header">
          <span class="aw-sunburst-swatch" :style="{ backgroundColor: entry.color }"></span>
          <span class="aw-sunburst-list-title">{{ entry.label }}</span>
        </div>
        <span class="aw-sunburst-list-value">{{ friendlyduration(entry.value) }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { getColorFromCategory } from '~/features/categorization/lib/color';
import { useCategoryStore } from '~/features/categorization/store/categories';

const example_data = {
  name: 'All',
  children: [
    { name: 'Coding', size: 0 },
    { name: 'Writing', size: 0 },
  ],
};

const SEP = '>';

function flattenTree(node: any, path: string[] = []) {
  const nextPath = node?.name && node.name !== 'All' ? path.concat(node.name) : path;
  const children = Array.isArray(node?.children) ? node.children : [];

  if (children.length === 0) {
    return [
      {
        path: nextPath.join(SEP) || node?.name || 'All',
        label: nextPath.join(' > ') || node?.name || 'All',
        value: Number(node?.size ?? node?.value ?? 0),
      },
    ];
  }

  return children.flatMap((child: any) => flattenTree(child, nextPath));
}

export default {
  props: {
    data: {
      type: Object,
      default: () => example_data,
    },
  },
  computed: {
    flattenedEntries() {
      const categoryStore = useCategoryStore();
      return flattenTree(this.data)
        .filter((entry: any) => entry.value > 0)
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 12)
        .map((entry: any) => {
          const category = categoryStore.get_category(entry.path.split(SEP));
          const color = getColorFromCategory(category, categoryStore.classes);
          return {
            ...entry,
            color,
          };
        });
    },
  },
};
</script>
