import { getClient } from '~/app/lib/awclient';
import { API_ENDPOINTS } from '~/shared/api/endpoints';

export interface PrivacyStatusResponse {
  configured: boolean;
  enabled: boolean;
  error: string;
}

export async function fetchPrivacyStatus(): Promise<PrivacyStatusResponse> {
  const response = await getClient().req.get(API_ENDPOINTS.hardware.privacy);
  return response.data as PrivacyStatusResponse;
}

export async function updatePrivacyEnabled(enabled: boolean): Promise<PrivacyStatusResponse> {
  const response = await getClient().req.post(API_ENDPOINTS.hardware.privacy, {
    enabled,
  });
  return response.data as PrivacyStatusResponse;
}
