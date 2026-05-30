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
  fetchPrivacyStatus,
  updatePrivacyEnabled,
} from '~/features/privacy/lib/privacyClient';

describe('privacy API client', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  test('reads the flat privacy status contract', async () => {
    const payload = { configured: true, enabled: true, error: '' };
    mockGet.mockResolvedValue({ data: payload });

    await expect(fetchPrivacyStatus()).resolves.toEqual(payload);
    expect(mockGet).toHaveBeenCalledWith('/0/hardware/privacy');
  });

  test('posts one boolean and returns the flat status contract', async () => {
    const payload = { configured: true, enabled: false, error: '' };
    mockPost.mockResolvedValue({ data: payload });

    await expect(updatePrivacyEnabled(false)).resolves.toEqual(payload);
    expect(mockPost).toHaveBeenCalledWith('/0/hardware/privacy', {
      enabled: false,
    });
  });
});
