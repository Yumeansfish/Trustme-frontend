import type { View, ViewElement } from '~/features/activity/lib/layout/activityViewCatalog';
import {
  ACTIVITY_PLUGIN_PROMPT_VISUALIZATIONS,
  ACTIVITY_VISUALIZATION,
  BROWSER_ACTIVITY_VISUALIZATIONS,
  CATEGORY_TOP_ACTIVITY_VISUALIZATIONS,
} from '~/features/activity/lib/visualization/activityVisualizationRegistry';

const BROWSER_PLUGIN_VISUALIZATIONS = [...BROWSER_ACTIVITY_VISUALIZATIONS];

export interface ActivityViewDataState {
  loaded: boolean;
  query_options: unknown;
  buckets: {
    loaded: boolean;
  };
  window: {
    top_apps: unknown;
  };
  browser: {
    available: boolean;
    top_domains: unknown;
    top_urls: unknown;
    top_titles: unknown;
  };
  category: {
    top: unknown;
    by_period: unknown;
  };
}

const BROWSER_VISUALIZATION_ACCESSORS: Record<string, (state: ActivityViewDataState) => unknown> = {
  [ACTIVITY_VISUALIZATION.TOP_DOMAINS]: state => state.browser.top_domains,
  [ACTIVITY_VISUALIZATION.TOP_URLS]: state => state.browser.top_urls,
  [ACTIVITY_VISUALIZATION.TOP_BROWSER_TITLES]: state => state.browser.top_titles,
};

export function resolveActivityPageView(
  resolvedViews: View[],
  requestedViewId: string
): View | null {
  if (requestedViewId === 'default') {
    return resolvedViews[0] || null;
  }

  return resolvedViews.find(view => view.id === requestedViewId) || resolvedViews[0] || null;
}

function firstMatchingVisualizationIndex(elements: ViewElement[], candidates: string[]): number {
  return elements.findIndex(element => candidates.includes(element.type));
}

export function resolveActivityVisualizationType({
  type,
  index,
  elements,
  bucketsLoaded,
  browserAvailable,
}: {
  type: string;
  index: number;
  elements: ViewElement[];
  bucketsLoaded: boolean;
  browserAvailable: boolean;
}): string | null {
  if (!bucketsLoaded) {
    return type;
  }

  if (BROWSER_PLUGIN_VISUALIZATIONS.includes(type) && !browserAvailable) {
    const firstBrowserIndex = firstMatchingVisualizationIndex(
      elements,
      BROWSER_PLUGIN_VISUALIZATIONS
    );
    return index === firstBrowserIndex ? ACTIVITY_VISUALIZATION.BROWSER_PLUGIN_PROMPT : null;
  }

  return type;
}

export function isActivityPluginPrompt(type: string | null): boolean {
  return type !== null && ACTIVITY_PLUGIN_PROMPT_VISUALIZATIONS.has(type);
}

export function resolveActivityVisualizationSpanClass({
  resolvedType,
}: {
  resolvedType: string | null;
}): string {
  const isFullWidth =
    resolvedType === ACTIVITY_VISUALIZATION.TIMELINE_BARCHART ||
    isActivityPluginPrompt(resolvedType);

  return isFullWidth ? 'lg:col-span-6 xl:col-span-12' : 'lg:col-span-3 xl:col-span-4';
}

export function resolveActivityVisualizationHeightClass({
  resolvedType,
}: {
  resolvedType: string | null;
}): string {
  if (resolvedType === ACTIVITY_VISUALIZATION.TIMELINE_BARCHART) {
    return 'aw-vis-card-timeline';
  }

  if (isActivityPluginPrompt(resolvedType)) {
    return 'aw-vis-card-tall';
  }

  return 'aw-vis-card-standard';
}

function resolvePluginVisualizationReady(
  type: string,
  activityStore: ActivityViewDataState,
  accessors: Record<string, (state: ActivityViewDataState) => unknown>,
  pluginAvailable: boolean
): boolean | null {
  const accessor = accessors[type];
  if (!accessor) {
    return null;
  }

  if (!pluginAvailable && activityStore.buckets.loaded) {
    return true;
  }

  return accessor(activityStore) !== null;
}

export function isActivityVisualizationReady(
  type: string,
  activityStore: ActivityViewDataState
): boolean {
  const browserReady = resolvePluginVisualizationReady(
    type,
    activityStore,
    BROWSER_VISUALIZATION_ACCESSORS,
    activityStore.browser.available
  );
  if (browserReady !== null) {
    return browserReady;
  }

  if (type === ACTIVITY_VISUALIZATION.TOP_APPS) {
    return activityStore.window.top_apps !== null;
  }

  if (CATEGORY_TOP_ACTIVITY_VISUALIZATIONS.has(type)) {
    return activityStore.category.top !== null;
  }

  if (type === ACTIVITY_VISUALIZATION.TIMELINE_BARCHART) {
    return activityStore.category.by_period !== null;
  }

  return true;
}
