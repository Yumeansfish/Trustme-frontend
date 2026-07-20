const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('~/app/lib/awclient', () => ({
  getClient: () => ({ req: { get: mockGet, post: mockPost } }),
}));

import { persistSettingsSubset } from '~/features/settings/store/settingsPersistence';

test('persists an explicit false instead of assuming the server default', async () => {
  mockGet.mockResolvedValue({ data: {} });
  mockPost.mockResolvedValue({ data: null });
  await persistSettingsSubset({ enabled: false }, ['enabled']);
  expect(mockPost).toHaveBeenCalled();
  expect(mockPost.mock.calls[0]).toContainEqual(false);
});

test.each([null, [], 'bad'])('does not replace malformed server settings %p with defaults', async data => {
  mockGet.mockResolvedValue({ data });
  mockPost.mockClear();
  await expect(persistSettingsSubset({ theme: 'dark' }, ['theme'])).rejects.toThrow('Invalid settings response');
  expect(mockPost).not.toHaveBeenCalled();
});
