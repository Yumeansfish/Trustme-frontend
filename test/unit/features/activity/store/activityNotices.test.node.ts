import {
  buildDashboardDegradedNotice,
  formatActivityVisualizationType,
} from '~/features/activity-dashboard/store/activityNotices';

describe('activityNotices', () => {
  test('formatActivityVisualizationType turns store ids into readable labels', () => {
    expect(formatActivityVisualizationType('top_apps')).toBe('Top Apps');
    expect(formatActivityVisualizationType('timeline_barchart')).toBe('Timeline Barchart');
  });

  test('buildDashboardDegradedNotice deduplicates dto names', () => {
    const notice = buildDashboardDegradedNotice(['details', 'summary snapshot', 'details']);

    expect(notice.variant).toBe('danger');
    expect(notice.items).toEqual(['details unavailable', 'summary snapshot unavailable']);
  });
});
