import { getClient } from '~/app/lib/awclient';
import { ensureEventList } from '~/shared/lib/activitywatchData';
import { abortableRequestConfig, isRequestAbortError } from '~/shared/lib/httpRequest';
import type { ExecutionRange } from '~/shared/lib/timeRange';
import type { BrowserResponse } from '~/shared/contracts/browser.generated';

const BROWSER_ENDPOINT = '/0/dashboard/browser';

export async function fetchBrowserActivity({
  range,
  signal,
}: {
  range: ExecutionRange | null;
  signal?: AbortSignal;
}): Promise<BrowserResponse | null> {
  if (!range) return null;

  let response;
  try {
    response = await getClient().req.post(
      BROWSER_ENDPOINT,
      { range: { start: range.start.toISOString(), end: range.end.toISOString() } },
      abortableRequestConfig(signal)
    );
  } catch (error) {
    if (isRequestAbortError(error)) throw error;
    console.warn('Browser activity endpoint unavailable', error);
    return null;
  }
  return {
    domains: ensureEventList(response.data?.domains),
    urls: ensureEventList(response.data?.urls),
    titles: ensureEventList(response.data?.titles),
  };
}
