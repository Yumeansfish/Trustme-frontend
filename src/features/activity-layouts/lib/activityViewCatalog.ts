import { ACTIVITY_VISUALIZATION } from '~/features/activity-visualizations/lib/activityVisualizationRegistry';

export interface ViewElement {
  id?: string;
  type: string;
  size?: number;
}

export interface View {
  id: string;
  name: string;
  elements: ViewElement[];
}

let viewElementIdCounter = 0;

function createViewElementId(): string {
  viewElementIdCounter += 1;
  return `activity-vis-${viewElementIdCounter}`;
}

function cloneViewElement(element: ViewElement): ViewElement {
  return {
    ...element,
    id:
      typeof element.id === 'string' && element.id.length > 0 ? element.id : createViewElementId(),
  };
}

export const defaultViews: View[] = [
  {
    id: 'summary',
    name: 'Summary',
    elements: [
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TIMELINE_BARCHART, size: 3 }),
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.CATEGORY_DONUT, size: 3 }),
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TOP_CATEGORIES, size: 3 }),
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TOP_APPS, size: 3 }),
    ],
  },
  {
    id: 'browser',
    name: 'Browser',
    elements: [
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TOP_DOMAINS, size: 3 }),
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TOP_URLS, size: 3 }),
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TOP_BROWSER_TITLES, size: 3 }),
    ],
  },
  {
    id: 'editor',
    name: 'Editor',
    elements: [cloneViewElement({ type: ACTIVITY_VISUALIZATION.EDITOR_PLUGIN_PROMPT, size: 3 })],
  },
];

export function resolveDefaultViewId(fallbackViews: View[] = defaultViews): string {
  return fallbackViews[0]?.id || 'summary';
}
