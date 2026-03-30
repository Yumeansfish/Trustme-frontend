const mockGet = jest.fn();

jest.mock('~/app/lib/awclient', () => ({
  getClient: () => ({
    req: {
      get: mockGet,
    },
  }),
}));

import { fetchCheckins } from '~/features/checkins/lib/checkinsClient';

describe('check-ins API client', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  test('gets availability and the selected day sessions in one request', async () => {
    const session = { id: 'session-1', date: '2026-07-18' };
    mockGet.mockResolvedValue({
      data: {
        available_dates: ['2026-07-18', 'invalid', '2026-07-17', '2026-07-18'],
        sessions: [session],
      },
    });

    const payload = await fetchCheckins('2026-07-18');

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/0/dashboard/checkins', {
      params: { date: '2026-07-18' },
    });
    expect(payload).toEqual({
      available_dates: ['2026-07-17', '2026-07-18'],
      sessions: [session],
    });
  });
});
