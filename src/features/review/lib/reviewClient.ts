import { getClient } from '~/app/lib/awclient';
import type { ReviewResponse } from '~/shared/contracts/review.generated';
import { normalizeAvailableDates } from '~/shared/navigation/dateAvailability';

const REVIEW_ENDPOINT = '/0/review';

export async function requestReviewSync(): Promise<void> {
  await getClient().req.post(`${REVIEW_ENDPOINT}/sync`);
}

export async function fetchReview(date?: string): Promise<ReviewResponse> {
  const response = await getClient().req.get(REVIEW_ENDPOINT, {
    params: date ? { date } : {},
  });
  const payload = response.data as Partial<ReviewResponse>;
  return {
    available_dates: normalizeAvailableDates(payload.available_dates),
    highlights: Array.isArray(payload.highlights) ? payload.highlights : [],
  };
}
