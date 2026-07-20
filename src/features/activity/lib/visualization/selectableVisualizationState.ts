import {
  ACTIVITY_VISUALIZATION,
  ACTIVITY_VISUALIZATION_TITLES,
  BROWSER_ACTIVITY_VISUALIZATIONS,
} from '~/features/activity/lib/visualization/activityVisualizationRegistry';
import type { IEvent } from '~/shared/lib/interfaces';

const FIREFOX_BROWSER_WATCHER_URL =
  'https://addons.mozilla.org/firefox/downloads/latest/aw-watcher-web/latest.xpi';
const CHROMIUM_BROWSER_WATCHER_URL =
  'https://chromewebstore.google.com/detail/activitywatch-web-watcher/nglaklhklhcoonedhgnpgddginnjdadi';
const BROWSER_WATCHER_PROJECT_URL = 'https://github.com/ActivityWatch/aw-watcher-web';
const VSCODE_WATCHER_MARKETPLACE_URL =
  'https://marketplace.visualstudio.com/items?itemName=activitywatch.aw-watcher-vscode';
const LOCAL_ACTIVITY_VISUALIZATIONS = new Set<string>([
  ACTIVITY_VISUALIZATION.TOP_APPS,
  ACTIVITY_VISUALIZATION.TOP_CATEGORIES,
  ACTIVITY_VISUALIZATION.CATEGORY_DONUT,
  ACTIVITY_VISUALIZATION.TIMELINE_BARCHART,
]);

export interface SelectableVisualizationRegistryEntry {
  title: string;
  available: boolean;
}

export interface SelectableVisualizationRegistry {
  browser_plugin_prompt: SelectableVisualizationRegistryEntry;
  [key: string]: SelectableVisualizationRegistryEntry;
}

export interface SelectableVisualizationActivityState {
  window: { available: boolean };
  browser: { available: boolean };
  editor: { available: boolean };
  category: {
    available: boolean;
    top: IEvent[] | null;
  };
  query_options?: {
    date?: string;
    timeperiod?: {
      start?: string;
      length?: unknown;
    };
  } | null;
}

export interface PluginInstallState {
  kind: 'browser' | 'editor';
  icon: string;
  title: string;
  points: string;
  copy: string;
}

export interface PluginInstallAction {
  href: string;
  download: string;
  label: string;
}

export type BrowserInstallTarget = 'firefox' | 'chromium' | 'unsupported';

export function resolveBrowserInstallTarget(userAgent: string): BrowserInstallTarget {
  if (/firefox/i.test(userAgent)) return 'firefox';
  if (/(chromium|chrome|crios|edg|opr)/i.test(userAgent)) return 'chromium';
  return 'unsupported';
}

export function buildSelectableVisualizationRegistry(
  activityStore: SelectableVisualizationActivityState
): SelectableVisualizationRegistry {
  return {
    [ACTIVITY_VISUALIZATION.BROWSER_PLUGIN_PROMPT]: {
      title: ACTIVITY_VISUALIZATION_TITLES[ACTIVITY_VISUALIZATION.BROWSER_PLUGIN_PROMPT],
      available: true,
    },
    [ACTIVITY_VISUALIZATION.EDITOR_PLUGIN_PROMPT]: {
      title: ACTIVITY_VISUALIZATION_TITLES[ACTIVITY_VISUALIZATION.EDITOR_PLUGIN_PROMPT],
      available: true,
    },
    [ACTIVITY_VISUALIZATION.TOP_APPS]: {
      title: ACTIVITY_VISUALIZATION_TITLES[ACTIVITY_VISUALIZATION.TOP_APPS],
      available: activityStore.window.available,
    },
    [ACTIVITY_VISUALIZATION.TOP_DOMAINS]: {
      title: ACTIVITY_VISUALIZATION_TITLES[ACTIVITY_VISUALIZATION.TOP_DOMAINS],
      available: activityStore.browser.available,
    },
    [ACTIVITY_VISUALIZATION.TOP_URLS]: {
      title: ACTIVITY_VISUALIZATION_TITLES[ACTIVITY_VISUALIZATION.TOP_URLS],
      available: activityStore.browser.available,
    },
    [ACTIVITY_VISUALIZATION.TOP_BROWSER_TITLES]: {
      title: ACTIVITY_VISUALIZATION_TITLES[ACTIVITY_VISUALIZATION.TOP_BROWSER_TITLES],
      available: activityStore.browser.available,
    },
    [ACTIVITY_VISUALIZATION.TOP_CATEGORIES]: {
      title: ACTIVITY_VISUALIZATION_TITLES[ACTIVITY_VISUALIZATION.TOP_CATEGORIES],
      available: activityStore.category.available,
    },
    [ACTIVITY_VISUALIZATION.CATEGORY_DONUT]: {
      title: ACTIVITY_VISUALIZATION_TITLES[ACTIVITY_VISUALIZATION.CATEGORY_DONUT],
      available: activityStore.category.available,
    },
    [ACTIVITY_VISUALIZATION.TIMELINE_BARCHART]: {
      title: ACTIVITY_VISUALIZATION_TITLES[ACTIVITY_VISUALIZATION.TIMELINE_BARCHART],
      available: true,
    },
  };
}

export function resolvePluginInstallState(
  type: string,
  activityStore: Pick<SelectableVisualizationActivityState, 'browser'>
): PluginInstallState | null {
  if (
    type === ACTIVITY_VISUALIZATION.BROWSER_PLUGIN_PROMPT ||
    (BROWSER_ACTIVITY_VISUALIZATIONS.has(type) && !activityStore.browser.available)
  ) {
    return {
      kind: 'browser',
      icon: 'globe',
      title: 'Unlock Browser Activity',
      points: 'Domains • URLs • Tab Titles',
      copy: 'Install the browser watcher for this browser, then reload the dashboard.',
    };
  }

  if (type === ACTIVITY_VISUALIZATION.EDITOR_PLUGIN_PROMPT) {
    return {
      kind: 'editor',
      icon: 'terminal',
      title: 'Unlock Editor Activity',
      points: 'Files • Projects • Languages',
      copy: 'Install the VS Code watcher plugin from the marketplace, then reload the dashboard.',
    };
  }

  return null;
}

export function resolvePluginInstallAction(
  pluginInstallState: PluginInstallState | null,
  browserInstallTarget: BrowserInstallTarget
): PluginInstallAction {
  if (!pluginInstallState) {
    return {
      href: '#',
      download: '',
      label: 'Install Plugin',
    };
  }

  if (pluginInstallState.kind === 'browser') {
    if (browserInstallTarget === 'unsupported') {
      return {
        href: BROWSER_WATCHER_PROJECT_URL,
        download: '',
        label: 'View Supported Browsers',
      };
    }
    return {
      href:
        browserInstallTarget === 'firefox'
          ? FIREFOX_BROWSER_WATCHER_URL
          : CHROMIUM_BROWSER_WATCHER_URL,
      download: '',
      label:
        browserInstallTarget === 'firefox' ? 'Install Firefox Watcher' : 'Install Chromium Watcher',
    };
  }

  if (pluginInstallState.kind === 'editor') {
    return {
      href: VSCODE_WATCHER_MARKETPLACE_URL,
      download: '',
      label: 'Install Plugin',
    };
  }

  return {
    href: '#',
    download: '',
    label: 'Install Plugin',
  };
}

export function resolveMissingPrerequisiteMessage(type: string): string {
  if (
    type === ACTIVITY_VISUALIZATION.BROWSER_PLUGIN_PROMPT ||
    BROWSER_ACTIVITY_VISUALIZATIONS.has(type)
  ) {
    return 'This feature is missing data from a required browser watcher. Install the matching browser watcher for this host, then reload the dashboard.';
  }

  if (LOCAL_ACTIVITY_VISUALIZATIONS.has(type)) {
    return 'This feature is missing local activity data for this host. Make sure trust-me is running and that the AFK and window watchers have reported data, then reload the dashboard.';
  }

  return 'This feature is missing required data for this host. Reload the dashboard after the corresponding watcher reports data.';
}
