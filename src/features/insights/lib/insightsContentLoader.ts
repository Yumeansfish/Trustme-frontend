import type {
  ModelOutputReport,
  ModelOutputResponse,
} from '~/shared/contracts/model-output.generated';

export type InsightsFetcher = (date?: string) => Promise<ModelOutputResponse>;

export interface InsightsContentData {
  availableDates: string[];
  resolvedDate: string;
  reports: ModelOutputReport[];
}

function reportsForDate(payload: ModelOutputResponse, date: string): ModelOutputReport[] {
  return payload.reports
    .filter(report => report.date === date)
    .sort((left, right) => left.period_start.localeCompare(right.period_start));
}

/** Load only the selected calendar day. */
export async function loadInsightsContent(
  preferredDate: string,
  fetcher: InsightsFetcher
): Promise<InsightsContentData> {
  const preferredPayload = await fetcher(preferredDate);
  return {
    availableDates: preferredPayload.available_dates,
    resolvedDate: preferredDate,
    reports: reportsForDate(preferredPayload, preferredDate),
  };
}
