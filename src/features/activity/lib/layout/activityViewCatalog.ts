import { ACTIVITY_VISUALIZATION } from '~/features/activity/lib/visualization/activityVisualizationRegistry';

export interface ViewElement {
  id?: string;
  type: string;
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
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TIMELINE_BARCHART }),
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.CATEGORY_DONUT }),
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TOP_CATEGORIES }),
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TOP_APPS }),
    ],
  },
  {
    id: 'browser',
    name: 'Browser',
    elements: [
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TOP_DOMAINS }),
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TOP_URLS }),
      cloneViewElement({ type: ACTIVITY_VISUALIZATION.TOP_BROWSER_TITLES }),
    ],
  },
  {
    id: 'editor',
    name: 'Editor',
    elements: [cloneViewElement({ type: ACTIVITY_VISUALIZATION.EDITOR_PLUGIN_PROMPT })],
  },
];

export function resolveDefaultViewId(fallbackViews: View[] = defaultViews): string {
  return fallbackViews[0]?.id || 'summary';
}
