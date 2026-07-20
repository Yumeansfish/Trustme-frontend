const mockPost = jest.fn();

jest.mock('~/app/lib/awclient', () => ({
  getClient: () => ({
    req: {
      post: mockPost,
    },
  }),
}));

import { testRemoteConnection } from '~/features/settings/lib/remoteSettingsClient';

describe('remote settings API client', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  test('tests SSH using the unsaved remote draft', async () => {
    const remote = {
      sshTarget: 'trust',
      setupDir: '~/trust-me-setup',
      participantName: 'Chengyu',
      reviewSyncStartDate: '2026-07-18',
    };
    const payload = { configured: true, reachable: true, error: '' };
    mockPost.mockResolvedValue({ data: payload });

    await expect(testRemoteConnection(remote)).resolves.toEqual(payload);
    expect(mockPost).toHaveBeenCalledWith('/0/remote/test-connection', remote);
  });
});
