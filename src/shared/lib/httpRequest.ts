import axios from 'axios';

export function isRequestAbortError(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { code?: string; name?: string; message?: string };
  const message = (candidate.message || '').toLowerCase();
  return (
    candidate.code === 'ERR_CANCELED' ||
    candidate.name === 'CanceledError' ||
    candidate.name === 'AbortError' ||
    message.includes('canceled') ||
    message.includes('aborted')
  );
}

export function abortableRequestConfig(signal?: AbortSignal) {
  return signal ? { signal } : undefined;
}
