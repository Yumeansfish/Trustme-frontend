import {
  isActivityVisualizationReady,
  resolveActivityPageView,
  resolveActivityVisualizationHeightClass,
  resolveActivityVisualizationSpanClass,
  resolveActivityVisualizationType,
} from '~/features/activity/lib/layout/activityViewLayout';

describe('activityViewLayout', () => {
  test('resolves the requested activity page view with a default fallback', () => {
    const views = [
      { id: 'summary', name: 'Summary', elements: [] },
      { id: 'browser', name: 'Browser', elements: [] },
    ];

    expect(resolveActivityPageView(views, 'browser')).toEqual(views[1]);
    expect(resolveActivityPageView(views, 'default')).toEqual(views[0]);
    expect(resolveActivityPageView(views, 'missing')).toEqual(views[0]);
  });

  test('replaces unavailable browser visualizations with one plugin prompt', () => {
    const elements = [{ type: 'top_domains' }, { type: 'top_urls' }];

    expect(
      resolveActivityVisualizationType({
        type: 'top_domains',
        index: 0,
        editing: false,
        elements,
        bucketsLoaded: true,
        browserAvailable: false,
      })
    ).toBe('browser_plugin_prompt');
    expect(
      resolveActivityVisualizationType({
        type: 'top_urls',
        index: 1,
        editing: false,
        elements,
        bucketsLoaded: true,
        browserAvailable: false,
      })
    ).toBeNull();
  });

  test('derives visualization layout classes from resolved types', () => {
    expect(
      resolveActivityVisualizationSpanClass({
        resolvedType: 'top_apps',
      })
    ).toBe('lg:col-span-3 xl:col-span-4');
    expect(
      resolveActivityVisualizationHeightClass({
        resolvedType: 'browser_plugin_prompt',
      })
    ).toBe('aw-vis-card-tall');
    expect(
      resolveActivityVisualizationSpanClass({
        resolvedType: 'editor_plugin_prompt',
      })
    ).toBe('lg:col-span-6 xl:col-span-12');
  });

  test('computes visualization readiness from activity data state', () => {
    const activityStore = {
      loaded: true,
      query_options: { host: 'alpha.local' },
      buckets: { loaded: true },
      window: { top_apps: [] },
      browser: {
        available: false,
        top_domains: null,
        top_urls: null,
        top_titles: null,
      },
      category: { top: [], by_period: [] },
    };

    expect(isActivityVisualizationReady('top_domains', activityStore)).toBe(true);
    expect(isActivityVisualizationReady('top_apps', activityStore)).toBe(true);
    activityStore.window.top_apps = null;
    expect(isActivityVisualizationReady('top_apps', activityStore)).toBe(false);
  });
});
