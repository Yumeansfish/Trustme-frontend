let activeRequestController: AbortController | null = null;

export function beginActivityRequest(): AbortSignal {
  activeRequestController?.abort();
  activeRequestController = new AbortController();
  return activeRequestController.signal;
}

export function cancelActivityRequest(): void {
  activeRequestController?.abort();
  activeRequestController = null;
}

export function finishActivityRequest(signal: AbortSignal): void {
  if (activeRequestController?.signal === signal) {
    activeRequestController = null;
  }
}
