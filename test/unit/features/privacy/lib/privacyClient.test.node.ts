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

import { fetchPrivacyStatus, updatePrivacyEnabled } from '~/features/privacy/lib/privacyClient';

describe('privacy API client', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  test('reads the flat privacy status contract', async () => {
    const payload = { configured: true, state: 'on', enabled: true, error: '' };
    mockGet.mockResolvedValue({ data: payload });

    await expect(fetchPrivacyStatus()).resolves.toEqual(payload);
    expect(mockGet).toHaveBeenCalledWith('/0/hardware/privacy');
  });

  test('reads the cold-cache not-connected status without treating it as enabled', async () => {
    mockGet.mockResolvedValue({
      data: { configured: true, state: 'not-connected', enabled: false, error: '' },
    });

    await expect(fetchPrivacyStatus()).resolves.toEqual({
      configured: true,
      state: 'not-connected',
      enabled: false,
      error: '',
    });
  });

  test('posts one boolean and returns the flat status contract', async () => {
    const payload = { configured: true, state: 'off', enabled: false, error: '' };
    mockPost.mockResolvedValue({ data: payload });

    await expect(updatePrivacyEnabled(false)).resolves.toEqual(payload);
    expect(mockPost).toHaveBeenCalledWith('/0/hardware/privacy', {
      enabled: false,
    });
  });
});
