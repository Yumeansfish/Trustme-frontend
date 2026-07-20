jest.mock('~/features/activity/components/SelectableVisualization.vue', () => ({
  default: { name: 'SelectableVisualization' },
}));

import {
  loadSelectableVisualizationComponent,
  preloadActivityViewComponents,
} from '~/features/activity/lib/layout/activityComponentPreload';

test('preloads the same component used when the activity view opens', async () => {
  const component = await loadSelectableVisualizationComponent();
  await expect(preloadActivityViewComponents()).resolves.toEqual([
    { status: 'fulfilled', value: component },
  ]);
});
