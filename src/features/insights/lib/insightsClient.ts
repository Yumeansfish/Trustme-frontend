import { getClient } from '~/app/lib/awclient';
import type {
  InsightConfirmationState,
  ModelOutputCounterfactual,
  ModelOutputReport,
  ModelOutputResponse,
  ModelOutputResult,
} from '~/shared/contracts/model-output.generated';
import { normalizeAvailableDates } from '~/shared/navigation/dateAvailability';

const MODEL_OUTPUT_ENDPOINT = '/0/dashboard/model-output';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Invalid numeric value in model output');
  }
  return value;
}

function normalizeCounterfactualShift(
  value: unknown
): ModelOutputCounterfactual['shifts'][number] {
  if (!isRecord(value)) throw new Error('Invalid counterfactual shift');
  if (
    typeof value.category !== 'string' ||
    typeof value.title !== 'string'
  ) {
    throw new Error('Invalid counterfactual shift');
  }
  return {
    category: value.category,
    title: value.title,
    current_minutes: finiteNumber(value.current_minutes),
    delta_minutes: finiteNumber(value.delta_minutes),
  };
}

function normalizeCounterfactual(
  value: unknown,
  expectedTarget: string
): ModelOutputCounterfactual {
  if (
    !isRecord(value) ||
    value.target !== expectedTarget ||
    !['Keep', 'Improve slightly', 'Greatly improve'].includes(String(value.strength)) ||
    !Array.isArray(value.shifts)
  ) {
    throw new Error('Invalid counterfactual response');
  }
  return {
    target: expectedTarget,
    strength: String(value.strength),
    shifts: value.shifts.map(normalizeCounterfactualShift),
  };
}

function normalizeResult(value: unknown): ModelOutputResult {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.has_counterfactual !== 'boolean' ||
    !isRecord(value.scale) ||
    typeof value.scale.min_label !== 'string' ||
    typeof value.scale.max_label !== 'string'
  ) {
    throw new Error('Invalid insight result');
  }
  const minimum = finiteNumber(value.scale.min);
  const maximum = finiteNumber(value.scale.max);
  if (maximum <= minimum) throw new Error('Invalid insight scale');
  return {
    id: value.id,
    title: value.id === 'arousal' ? 'Energy' : value.title,
    score: finiteNumber(value.score),
    has_counterfactual: value.has_counterfactual,
    scale: {
      min: minimum,
      max: maximum,
      min_label: value.scale.min_label,
      max_label: value.scale.max_label,
    },
  };
}

function normalizeConfirmation(value: unknown): InsightConfirmationState | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !Array.isArray(value.required_targets) || !value.required_targets.every(item => typeof item === 'string') ||
    !Array.isArray(value.confirmed_targets) || !value.confirmed_targets.every(item => typeof item === 'string') ||
    typeof value.confirm_by !== 'string' ||
    typeof value.session_ends_at !== 'string' ||
    (value.feedback_available_at !== null && typeof value.feedback_available_at !== 'string')
  ) throw new Error('Invalid insight confirmation');
  return {
    required_targets: value.required_targets,
    confirmed_targets: value.confirmed_targets,
    confirm_by: value.confirm_by,
    session_ends_at: value.session_ends_at,
    feedback_available_at: value.feedback_available_at,
  };
}

export function normalizeInsightsReport(value: unknown): ModelOutputReport {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.date !== 'string' ||
    typeof value.period_start !== 'string' ||
    typeof value.period_end !== 'string' ||
    (value.checkin_session !== 'morning' && value.checkin_session !== 'afternoon') ||
    typeof value.suggestions_available_at !== 'string' ||
    (value.feedback_available_at !== null && typeof value.feedback_available_at !== 'string') ||
    !Array.isArray(value.results)
  ) {
    throw new Error('Invalid insight report');
  }
  return {
    id: value.id,
    date: value.date,
    period_start: value.period_start,
    period_end: value.period_end,
    checkin_session: value.checkin_session,
    confirmation: normalizeConfirmation(value.confirmation),
    suggestions_available_at: value.suggestions_available_at,
    feedback_available_at: value.feedback_available_at,
    results: value.results.map(normalizeResult),
  };
}

export async function fetchInsights(date?: string): Promise<ModelOutputResponse> {
  const response = await getClient().req.get(MODEL_OUTPUT_ENDPOINT, {
    params: date ? { date } : {},
  });
  if (
    !isRecord(response.data) ||
    !Array.isArray(response.data.reports) ||
    !Array.isArray(response.data.available_dates)
  ) {
    throw new Error('Invalid insights response');
  }
  return {
    available_dates: normalizeAvailableDates(response.data.available_dates),
    reports: response.data.reports
      .map(normalizeInsightsReport)
      .sort((left, right) => left.period_start.localeCompare(right.period_start)),
  };
}

export async function fetchCounterfactual(
  date: string,
  periodId: string,
  target: string
): Promise<ModelOutputCounterfactual> {
  const response = await getClient().req.post(`${MODEL_OUTPUT_ENDPOINT}/counterfactual`, {
    date,
    period_id: periodId,
    target,
  });
  return normalizeCounterfactual(response.data, target);
}
