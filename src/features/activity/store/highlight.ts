import { defineStore } from 'pinia';

interface HighlightState {
  category: string[] | null;
  app: string | null;
}

export const useActivityHighlightStore = defineStore('activity-highlight', {
  state: (): HighlightState => ({
    category: null,
    app: null,
  }),
  getters: {
    categoryLabel(state): string | null {
      return state.category ? state.category.join(' > ') : null;
    },
  },
  actions: {
    setCategory(category: string[] | null) {
      this.category = category;
      if (category === null) {
        this.app = null;
      }
    },
    setApp({ app, category }: { app: string | null; category?: string[] | null }) {
      this.app = app;
      this.category = category || null;
    },
    clear() {
      this.category = null;
      this.app = null;
    },
  },
});
