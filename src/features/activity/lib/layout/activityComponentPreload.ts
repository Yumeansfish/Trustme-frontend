import type { AsyncComponentLoader, Component } from 'vue';

export const loadSelectableVisualizationComponent: AsyncComponentLoader<Component> = () =>
  import('~/features/activity/components/SelectableVisualization.vue');

export function preloadActivityViewComponents(): Promise<PromiseSettledResult<unknown>[]> {
  // Preloading is optional; the lazy component handles errors when actually opened.
  return Promise.allSettled([loadSelectableVisualizationComponent()]);
}
