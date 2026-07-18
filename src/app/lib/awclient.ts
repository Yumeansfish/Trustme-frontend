import { AWClient } from 'aw-client';

import { appConfig, isProductionBuild } from '~/app/config/runtime';

const DEFAULT_REQUEST_TIMEOUT_SECONDS = 30;

let _client: AWClient | null;

export function createClient(force?: boolean): AWClient {
  let baseURL = '';

  // If running with `npx vite` (dev mode), use empty baseURL so requests go
  // to the same origin (localhost:27180), then Vite proxy forwards /api to
  // the real Trust-me server at http://127.0.0.1:5600 — no CORS needed.
  // VITE_AW_SERVER_URL can override this (e.g. point to a remote server).
  if (!isProductionBuild) {
    baseURL = appConfig.awServerUrl;
  }

  if (!_client || force) {
    _client = new AWClient('trust-me-frontend', {
      testing: !isProductionBuild,
      baseURL,
    });
  } else {
    throw new Error('Tried to instantiate global AWClient twice!');
  }
  return _client;
}

export function configureClient(
  requestTimeoutSeconds: number = DEFAULT_REQUEST_TIMEOUT_SECONDS
): void {
  const client = getClient();
  client.req.defaults.timeout = 1000 * requestTimeoutSeconds;
}

export function getClient(): AWClient {
  if (!_client) {
    throw new Error('Tried to get global AWClient before instantiating it!');
  }
  return _client;
}
