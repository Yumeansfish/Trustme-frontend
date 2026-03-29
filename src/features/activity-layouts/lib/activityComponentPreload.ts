import type { AsyncComponentLoader } from 'vue';

import type { View } from '~/features/activity-layouts/lib/activityViewCatalog';
import { ACTIVITY_VISUALIZATION } from '~/features/activity-visualizations/lib/activityVisualizationRegistry';

export type ActivityComponentPreloadName = 'selectable' | 'summary' | 'timeline' | 'donut';

type ActivityComponentLoader = AsyncComponentLoader<any>;

export const loadSelectableVisualizationComponent: ActivityComponentLoader = () =>
  import('~/features/activity-visualizations/components/SelectableVisualization.vue');
export const loadSummaryComponent: ActivityComponentLoader = () =>
  import('~/features/activity-visualizations/components/Summary.vue');
export const loadTimelineBarChartComponent: ActivityComponentLoader = () =>
  import('~/features/activity-visualizations/components/visualizations/TimelineBarChart.vue');
export const loadCategoryDonutComponent: ActivityComponentLoader = () =>
  import('~/features/categorization/components/visualizations/CategoryDonut.vue');

const ACTIVITY_COMPONENT_LOADERS: Record<ActivityComponentPreloadName, ActivityComponentLoader> = {
  selectable: loadSelectableVisualizationComponent,
  summary: loadSummaryComponent,
  timeline: loadTimelineBarChartComponent,
  donut: loadCategoryDonutComponent,
};

const VISUALIZATION_COMPONENT_PRELOADS: Record<string, ActivityComponentPreloadName[]> = {
  [ACTIVITY_VISUALIZATION.TOP_APPS]: ['summary'],
  [ACTIVITY_VISUALIZATION.TOP_CATEGORIES]: ['summary'],
  [ACTIVITY_VISUALIZATION.TOP_DOMAINS]: ['summary'],
  [ACTIVITY_VISUALIZATION.TOP_URLS]: ['summary'],
  [ACTIVITY_VISUALIZATION.TOP_BROWSER_TITLES]: ['summary'],
  [ACTIVITY_VISUALIZATION.TIMELINE_BARCHART]: ['timeline'],
  [ACTIVITY_VISUALIZATION.CATEGORY_DONUT]: ['donut'],
};

const activityComponentInflight = new Map<ActivityComponentPreloadName, Promise<unknown>>();

export function resolveActivityViewPreloadNames(
  view: Pick<View, 'elements'> | null | undefined
): ActivityComponentPreloadName[] {
  const names = new Set<ActivityComponentPreloadName>(['selectable']);

  for (const element of view?.elements || []) {
    const preloadNames = VISUALIZATION_COMPONENT_PRELOADS[element.type] || [];
    preloadNames.forEach(name => names.add(name));
  }

  return [...names];
}

function loadActivityComponentOnce(name: ActivityComponentPreloadName): Promise<unknown> {
  const existing = activityComponentInflight.get(name);
  if (existing) {
    return existing;
  }

  const loader = ACTIVITY_COMPONENT_LOADERS[name];
  const inflight = loader().catch(error => {
    activityComponentInflight.delete(name);
    throw error;
  });
  activityComponentInflight.set(name, inflight);
  return inflight;
}

export function preloadActivityViewComponents(
  view: Pick<View, 'elements'> | null | undefined
): Promise<Array<PromiseSettledResult<unknown>>> {
  return Promise.allSettled(
    resolveActivityViewPreloadNames(view).map(name => loadActivityComponentOnce(name))
  );
}
