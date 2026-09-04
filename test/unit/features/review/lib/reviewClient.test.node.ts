const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('~/app/lib/awclient', () => ({
  getClient: () => ({
    req: {
      get: mockGet,
      post: mockPost,
    },
  }),
}));

import { fetchReview, requestReviewSync } from '~/features/review/lib/reviewClient';

describe('review API client', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  test('requests one background refresh when the application starts', async () => {
    mockPost.mockResolvedValue({ data: { requested: true } });

    await requestReviewSync();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/0/review/sync');
  });

  test('gets only highlight history for the selected day', async () => {
    const highlight = { id: 'highlight-1', date: '2026-08-15' };
    mockGet.mockResolvedValue({
      data: {
        available_dates: ['2026-08-15', 'invalid', '2026-08-14', '2026-08-15'],
        highlights: [highlight],
      },
    });

    const payload = await fetchReview('2026-08-15');

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/0/review', {
      params: { date: '2026-08-15' },
    });
    expect(payload).toEqual({
      available_dates: ['2026-08-14', '2026-08-15'],
      highlights: [highlight],
    });
  });
});
