import {
  ACTIVITY_PERIOD_LABELS,
  expandActivityFilterCategories,
  formatActivityDateHeading,
} from '~/features/activity/lib/activityPresentation';

describe('activityPresentation', () => {
  test('exports stable period labels', () => {
    expect(ACTIVITY_PERIOD_LABELS).toEqual({
      day: 'day',
      week: 'week',
      month: 'month',
      year: 'year',
    });
  });

  test('formats activity headings for browseable and custom periods', () => {
    expect(
      formatActivityDateHeading(
        {
          start: '2026-03-21T04:00:00+00:00',
          length: [1, 'day'],
        },
        'day'
      )
    ).toContain('2026');

    expect(
      formatActivityDateHeading(
        {
          start: '2026-03-01T00:00:00+00:00',
          length: [47, 'days'],
        },
        'custom',
        '2026-04-16'
      )
    ).toBe('Mar 1, 2026 - Apr 16, 2026');
  });

  test('expands child categories when a parent filter is selected', () => {
    expect(
      expandActivityFilterCategories(['Code'], [
        ['Code'],
        ['Code', 'Debug'],
        ['Code', 'Review'],
        ['Life'],
      ])
    ).toEqual([['Code'], ['Code', 'Debug'], ['Code', 'Review']]);
    expect(expandActivityFilterCategories(null, [['Code']])).toBeNull();
  });
});
