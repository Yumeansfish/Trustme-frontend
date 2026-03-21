import {
  formatBucketDisplayName,
  formatBucketGroupTitle,
  getBucketBaseId,
} from '~/shared/lib/bucketDisplay';
import {
  buildBucketGroupKey,
  buildBucketGroups,
} from '~/features/buckets/lib/bucketGroups';

describe('bucket presentation', () => {
  test('owns Trust-me labels without trusting backend display_name', () => {
    const bucket = {
      id: 'aw-watcher-window_macbook',
      hostname: 'macbook',
      display_name: 'legacy backend label',
    };

    expect(getBucketBaseId(bucket)).toBe('aw-watcher-window');
    expect(formatBucketDisplayName(bucket)).toBe('trustme-window bucket');
    expect(buildBucketGroupKey(bucket)).toBe('aw-watcher-window');
    expect(formatBucketGroupTitle('aw-watcher-window')).toBe('window-bucket');
  });

  test('uses one presentation mapping for detail and group labels', () => {
    const cases = [
      ['aw-watcher-afk', 'trustme-presence bucket', 'presence-bucket'],
      ['aw-watcher-firefox', 'trustme-browser bucket', 'browser-bucket'],
      ['aw-watcher-vscode', 'trustme-editor bucket', 'editor-bucket'],
      ['aw-stopwatch', 'trustme-away bucket', 'away-bucket'],
    ];

    for (const [bucketId, detailLabel, groupLabel] of cases) {
      expect(formatBucketDisplayName(bucketId)).toBe(detailLabel);
      expect(formatBucketGroupTitle(bucketId)).toBe(groupLabel);
    }
  });

  test('groups host-suffixed buckets while preserving current title style', () => {
    const groups = buildBucketGroups([
      {
        id: 'aw-watcher-window_macbook',
        hostname: 'macbook',
        first_seen: '2026-07-17T09:00:00Z',
        last_updated: '2026-07-18T10:00:00Z',
      },
      {
        id: 'aw-watcher-window_laptop',
        hostname: 'laptop',
        first_seen: '2026-07-18T09:00:00Z',
        last_updated: '2026-07-18T11:00:00Z',
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      key: 'aw-watcher-window',
      title: 'window-bucket',
      bucketIds: [
        'aw-watcher-window_macbook',
        'aw-watcher-window_laptop',
      ],
      availableDates: ['2026-07-17', '2026-07-18'],
    });
  });
});
