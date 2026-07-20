import { createPinia, setActivePinia } from 'pinia';

import { createInitialActivityState } from '~/features/activity/store/activityState';
import {
  completeBrowserQuery,
  completeCategoryTimeByPeriodQuery,
  completeWindowQuery,
} from '~/features/activity/store/activityQueryResults';

describe('activityQueryResults', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test('completion helpers write normalized query results back to store state', () => {
    const state = createInitialActivityState();
    state.active_request_nonce = 1;

    completeWindowQuery(
      state,
      {
        duration: 120,
        app_events: [
          { timestamp: '2026-03-01T10:00:00.000Z', duration: 120, data: { app: 'Code' } },
        ] as any,
        cat_events: [
          {
            timestamp: '2026-03-01T10:00:00.000Z',
            duration: 120,
            data: { $category: ['Code'] },
          },
        ] as any,
      },
      1
    );
    completeBrowserQuery(
      state,
      {
        urls: [], titles: [],
        domains: [
          { timestamp: '2026-03-01T10:00:00.000Z', duration: 60, data: { $domain: 'example.com' } },
        ] as any,
      },
      1
    );
    completeCategoryTimeByPeriodQuery(
      state,
      {
        by_period: {
          periodA: {
            cat_events: [
              {
                timestamp: '2026-03-01T10:00:00.000Z',
                duration: 60,
                data: { $category: ['Code'] },
              },
            ] as any,
          },
        },
      },
      1
    );

    expect(state.window.duration).toBe(120);
    expect(state.window.top_apps?.[0]?.data?.app).toBe('Code');
    expect(state.browser.top_domains?.[0]?.data?.$domain).toBe('example.com');
    expect(state.category.by_period?.periodA?.cat_events).toHaveLength(1);
  });
});
