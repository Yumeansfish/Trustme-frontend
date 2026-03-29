const mockPost = jest.fn();

jest.mock('~/app/lib/awclient', () => ({
  getClientAbortSignal: () => undefined,
  getClient: () => ({ req: { post: mockPost } }),
}));

import { fetchTimeline } from '~/features/timeline/lib/timelineClient';

describe('timelineClient', () => {
  beforeEach(() => mockPost.mockReset());

  test('sends only a range and normalizes backend-composed lanes', async () => {
    mockPost.mockResolvedValue({
      data: {
        range_start: '2026-07-18T10:00:00+00:00',
        range_end: '2026-07-18T10:30:00+00:00',
        status: { event_count: 0, segments: [] },
        app_focus: {
          event_count: 1,
          segments: [
            {
              key: 'window:1',
              label: 'Code',
              detail: 'main.py',
              category: 'Development',
              source: 'Window',
              start: '2026-07-18T10:00:00+00:00',
              end: '2026-07-18T10:05:00+00:00',
              clipped_start: false,
              clipped_end: false,
              variant: 'primary',
            },
          ],
        },
      },
    });
    const start = new Date('2026-07-18T10:00:00.000Z');
    const end = new Date('2026-07-18T10:30:00.000Z');

    const result = await fetchTimeline({ start, end });

    expect(mockPost).toHaveBeenCalledWith(
      '/0/dashboard/timeline',
      { range: { start: start.toISOString(), end: end.toISOString() } },
      undefined
    );
    expect(result.app_focus.segments[0]).toMatchObject({
      label: 'Code',
      category: 'Development',
    });
  });
});
