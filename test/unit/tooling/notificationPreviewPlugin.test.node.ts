import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  notificationPreviewMiddleware,
  notificationPreviewPlugin,
} from '../../../scripts/notificationPreviewPlugin';

describe('Vite-only notification preview endpoint', () => {
  let server: Server;
  let origin: string;
  const launch = jest.fn();

  beforeEach(async () => {
    launch.mockReset().mockResolvedValue(undefined);
    const middleware = notificationPreviewMiddleware(launch);
    server = createServer((request, response) => middleware(request, response, () => {
      response.writeHead(404);
      response.end();
    }));
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  const request = (origin: string, payload: unknown, headers: Record<string, string> = {}) => fetch(
    `${origin}/api/0/notifications/test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    }
  );

  test('plugin is attached only to the dev server, not build or preview', () => {
    const plugin = notificationPreviewPlugin('/repo');
    expect(plugin.apply).toBe('serve');
    expect(plugin.configureServer).toBeDefined();
    expect(plugin.configurePreviewServer).toBeUndefined();
  });

  test.each(['feedback', 'suggestions'])('launches local %s preview', async kind => {
    const response = await request(origin, { kind }, { Origin: origin });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ requested: true, kind });
    expect(launch).toHaveBeenCalledWith(kind, origin);
  });

  test('rejects a different web origin', async () => {
    expect((await request(origin, {}, { Origin: 'https://example.org' })).status).toBe(403);
    expect(launch).not.toHaveBeenCalled();
  });

  test.each([[], { kind: 'anything' }, { kind: null }, { kind: ['feedback'] }])('rejects invalid payload %j', async payload => {
    expect((await request(origin, payload)).status).toBe(400);
    expect(launch).not.toHaveBeenCalled();
  });

  test('reports native launch errors', async () => {
    const logging = jest.spyOn(console, 'error').mockImplementation(() => {});
    launch.mockRejectedValue(new Error('No Python available'));
    try {
      expect((await request(origin, {})).status).toBe(503);
    } finally {
      logging.mockRestore();
    }
  });

  test('other API paths are left to the normal backend proxy', async () => {
    expect((await fetch(`${origin}/api/0/info`)).status).toBe(404);
    expect(launch).not.toHaveBeenCalled();
  });
});
