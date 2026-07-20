import {
  buildActivityDataDegradedNotice,
  formatActivityVisualizationType,
} from '~/features/activity/store/activityNotices';

describe('activityNotices', () => {
  test('formatActivityVisualizationType turns store ids into readable labels', () => {
    expect(formatActivityVisualizationType('top_apps')).toBe('Top Apps');
    expect(formatActivityVisualizationType('timeline_barchart')).toBe('Timeline Barchart');
  });

  test('buildActivityDataDegradedNotice deduplicates dto names', () => {
    const notice = buildActivityDataDegradedNotice(['browser', 'summary', 'browser']);

    expect(notice.variant).toBe('danger');
    expect(notice.items).toEqual(['browser unavailable', 'summary unavailable']);
  });
});
