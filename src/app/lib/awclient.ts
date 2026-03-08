import { AWClient } from 'aw-client';

import { useSettingsStore } from '~/features/settings/store/settings';

let _client: AWClient | null;

export function createClient(force?: boolean): AWClient {
  let baseURL = '';

  const production = typeof PRODUCTION !== 'undefined' && PRODUCTION;

  // If running with `npx vite` (dev mode), use empty baseURL so requests go
  // to the same origin (localhost:27180), then Vite proxy forwards /api to
  // the real AW server at http://127.0.0.1:5600 — no CORS needed.
  // AW_SERVER_URL can override this (e.g. point to a remote server).
  if (!production) {
    const aw_server_url = typeof AW_SERVER_URL !== 'undefined' ? AW_SERVER_URL : '';
    baseURL = aw_server_url;
  }

  if (!_client || force) {
    _client = new AWClient('aw-webui', {
      testing: !production,
      baseURL,
    });
  } else {
    throw 'Tried to instantiate global AWClient twice!';
  }
  return _client;
}

export function configureClient(): void {
  const settings = useSettingsStore();
  _client.req.defaults.timeout = 1000 * settings.requestTimeout;
}

export function getClient(): AWClient {
  if (!_client) {
    throw 'Tried to get global AWClient before instantiating it!';
  }
  return _client;
}
