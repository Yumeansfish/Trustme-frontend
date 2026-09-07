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

import {
  createDailyCheckIn,
  fetchDailyCheckIns,
} from '~/features/daily-check-in/lib/dailyCheckInClient';

describe('Daily Check-in API client', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  test('loads persisted Daily Check-ins', async () => {
    const payload = {
      checkins: [
        {
          checkin_date: '2026-08-27',
          checked_at: '2026-08-27T09:00:00+02:00',
        },
      ],
    };
    mockGet.mockResolvedValue({ data: payload });

    await expect(fetchDailyCheckIns()).resolves.toEqual(payload);
    expect(mockGet).toHaveBeenCalledWith('/0/daily-check-ins');
  });

  test("creates today's Daily Check-in", async () => {
    const payload = {
      checkin_date: '2026-08-27',
      checked_at: '2026-08-27T09:00:00+02:00',
    };
    mockPost.mockResolvedValue({ data: payload });

    await expect(createDailyCheckIn()).resolves.toEqual(payload);
    expect(mockPost).toHaveBeenCalledWith('/0/daily-check-ins');
  });
});
