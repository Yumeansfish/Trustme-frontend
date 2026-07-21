import { getClient } from '~/app/lib/awclient';
import {
  normalizePrivacyStatus,
  type PrivacyStatusResponse,
} from '~/features/privacy/lib/privacyState';

export type { PrivacyStatusResponse } from '~/features/privacy/lib/privacyState';

const PRIVACY_ENDPOINT = '/0/hardware/privacy';

export async function fetchPrivacyStatus(): Promise<PrivacyStatusResponse> {
  const response = await getClient().req.get(PRIVACY_ENDPOINT);
  return normalizePrivacyStatus(response.data);
}

export async function updatePrivacyEnabled(enabled: boolean): Promise<PrivacyStatusResponse> {
  const response = await getClient().req.post(PRIVACY_ENDPOINT, {
    enabled,
  });
  return normalizePrivacyStatus(response.data);
}
