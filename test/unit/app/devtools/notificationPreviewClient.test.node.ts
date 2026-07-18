const mockRuntime = { isDevelopmentServer: false };
jest.mock('~/app/config/runtime', () => mockRuntime);

import { previewQuestionnaireNotification } from '~/app/devtools/notificationPreviewClient';

describe('development-only notification client', () => {
  const originalFetch = globalThis.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    globalThis.fetch = fetchMock;
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    mockRuntime.isDevelopmentServer = false;
  });
  afterAll(() => { globalThis.fetch = originalFetch; });

  test('production cannot issue a preview request', async () => {
    await expect(previewQuestionnaireNotification()).rejects.toThrow('npm run dev');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('dev calls the same-origin Vite endpoint, not the configured backend', async () => {
    mockRuntime.isDevelopmentServer = true;
    await previewQuestionnaireNotification();
    expect(fetchMock).toHaveBeenCalledWith('/api/0/notifications/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'feedback' }),
    });
  });

  test('failed preview requests are visible to the button', async () => {
    mockRuntime.isDevelopmentServer = true;
    fetchMock.mockResolvedValue({ ok: false });
    await expect(previewQuestionnaireNotification()).rejects.toThrow('Unable to preview');
  });
});
