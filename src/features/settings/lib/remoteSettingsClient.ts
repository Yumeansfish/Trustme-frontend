import { getClient } from '~/app/lib/awclient';
import type { RemoteSettings } from '~/features/settings/lib/remoteSettings';

const REMOTE_CONNECTION_ENDPOINT = '/0/remote/test-connection';

export interface RemoteConnectionTestResponse {
  configured: boolean;
  reachable: boolean;
  error: string;
}

export async function testRemoteConnection(
  remote: RemoteSettings
): Promise<RemoteConnectionTestResponse> {
  const response = await getClient().req.post(REMOTE_CONNECTION_ENDPOINT, remote);
  return response.data as RemoteConnectionTestResponse;
}
