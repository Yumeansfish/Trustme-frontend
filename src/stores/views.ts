import { defineStore } from 'pinia';
import { useSettingsStore } from './settings';

interface IElement {
  type: string;
  size?: number;
  props?: Record<string, unknown>;
}

export interface View {
  id: string;
  name: string;
  elements: IElement[];
}

const desktopViews: View[] = [
  {
    id: 'summary',
    name: 'Summary',
    elements: [
      { type: 'timeline_barchart', size: 3 },
      { type: 'category_donut', size: 3 },
      { type: 'top_categories', size: 3 },
      { type: 'top_apps', size: 3 },
    ],
  },
  {
    id: 'window',
    name: 'Window',
    elements: [
      { type: 'top_apps', size: 3 },
      { type: 'top_titles', size: 3 },
    ],
  },
  {
    id: 'browser',
    name: 'Browser',
    elements: [
      { type: 'top_domains', size: 3 },
      { type: 'top_urls', size: 3 },
      { type: 'top_browser_titles', size: 3 },
    ],
  },
  {
    id: 'editor',
    name: 'Editor',
    elements: [
      { type: 'top_editor_files', size: 3 },
      { type: 'top_editor_projects', size: 3 },
      { type: 'top_editor_languages', size: 3 },
    ],
  },
];

const androidViews = [
  {
    id: 'summary',
    name: 'Summary',
    elements: [
      { type: 'timeline_barchart', size: 3 },
      { type: 'top_categories', size: 3 },
      { type: 'top_apps', size: 3 },
    ],
  },
];

// FIXME: Decide depending on what kind of device is being viewed, not from which device it is being viewed from.
export const defaultViews = !process.env.VUE_APP_ON_ANDROID ? desktopViews : androidViews;

interface State {
  views: View[];
}

export const useViewsStore = defineStore('views', {
  state: (): State => ({
    views: [],
  }),
  getters: {
    getViewById: state => (id: string) => state.views.find(view => view.id === id),
  },
  actions: {
    async load() {
      const settingsStore = useSettingsStore();
      await settingsStore.ensureLoaded();
      const views = settingsStore.views;

      const isViewsEmpty = !views || (Array.isArray(views) && views.length === 0) || (typeof views === 'object' && Object.keys(views).length === 0);

      if (isViewsEmpty) {
        console.log('ACTIVITY.VUE: settingsStore.views is empty, loading defaultViews instead', defaultViews);
        this.loadViews([...defaultViews]);
      } else {
        console.log('ACTIVITY.VUE: Loading views from settingsStore:', views);
        // Ensure it's an array, in case it was stored weirdly
        const viewsArray = Array.isArray(views) ? views : Object.values(views);
        this.loadViews(viewsArray as View[]);
      }
    },
    async save() {
      const settingsStore = useSettingsStore();
      settingsStore.update({ views: this.views });
      await this.load();
    },
    loadViews(views: View[]) {
      this.views = [...views];
      console.log('ACTIVITY.VUE: Loaded views:', this.views);
    },
    clearViews() {
      this.views = [];
    },
    setElements({ view_id, elements }: { view_id: string; elements: IElement[] }) {
      const view = this.views.find(v => v.id == view_id);
      if (view) view.elements = elements;
    },
    restoreDefaults() {
      this.views = [...defaultViews];
    },
    addView(view: View) {
      this.views.push({ ...view, elements: [] });
    },
    removeView({ view_id }) {
      const idx = this.views.map(v => v.id).indexOf(view_id);
      if (idx !== -1) this.views.splice(idx, 1);
    },
    editView({
      view_id,
      el_id,
      type,
      props,
    }: { view_id: string; el_id: string; type: string; props: Record<string, unknown> }) {
      const view = this.views.find(v => v.id == view_id);
      if (view && view.elements[el_id]) {
        view.elements[el_id].type = type;
        view.elements[el_id].props = props;
      }
    },
    addVisualization({ view_id, type }) {
      const view = this.views.find(v => v.id == view_id);
      if (view) view.elements.push({ type: type });
    },
    removeVisualization({ view_id, el_id }) {
      const view = this.views.find(v => v.id == view_id);
      if (view) view.elements.splice(el_id, 1);
    },
  },
});
