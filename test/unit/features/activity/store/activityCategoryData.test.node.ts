import type { IEvent } from '~/shared/lib/interfaces';

import { ensureByPeriod } from '~/features/activity-dashboard/store/activityCategoryData';

describe('activityCategoryData', () => {
  test('ensureByPeriod normalizes invalid entries to stable empty category lists', () => {
    const byPeriod = ensureByPeriod({
      hourA: {
        cat_events: [
          {
            timestamp: '2026-03-01T10:00:00.000Z',
            duration: 60,
            data: { $category: ['Code'] },
          },
        ] satisfies IEvent[],
      },
      hourB: {
        cat_events: null,
      },
      hourC: 'bad',
    });

    expect(byPeriod).toEqual({
      hourA: {
        cat_events: [
          {
            timestamp: '2026-03-01T10:00:00.000Z',
            duration: 60,
            data: { $category: ['Code'] },
          },
        ],
      },
      hourB: { cat_events: [] },
      hourC: { cat_events: [] },
    });
  });
});
