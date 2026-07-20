import type { SummaryResponse } from '~/shared/contracts/summary.generated';

export type SummaryPeriodMode = 'day' | 'week' | 'month' | 'year' | 'custom';
export type CategoryPeriodData = SummaryResponse['by_period'];
export type SummaryResult = SummaryResponse;
