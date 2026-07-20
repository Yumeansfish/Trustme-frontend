// This file is generated. Do not edit it by hand.
// Source: backend/src/browser/browser_dto.py via scripts/sync_frontend_contracts.py

import type { AggregatedEvent } from './activitywatch.generated';

export interface BrowserResponse {
  domains: AggregatedEvent[];
  urls: AggregatedEvent[];
  titles: AggregatedEvent[];
}
