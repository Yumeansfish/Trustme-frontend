import { getClient } from '~/app/lib/awclient';
import type {
  ModelFeedbackDTO,
  ModelFeedbackResponse,
  ModelFeedbackSubmission,
} from '~/shared/contracts/model-feedback.generated';

const MODEL_FEEDBACK_ENDPOINT = '/0/dashboard/model-feedback';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFeedback(value: unknown): ModelFeedbackDTO {
  if (
    !isRecord(value) ||
    typeof value.date !== 'string' ||
    typeof value.period_id !== 'string' ||
    typeof value.target !== 'string' ||
    typeof value.tried_to_follow !== 'boolean' ||
    (value.helped !== null && typeof value.helped !== 'boolean') ||
    typeof value.submitted_at !== 'string'
  ) {
    throw new Error('Invalid model feedback response');
  }
  return {
    date: value.date,
    period_id: value.period_id,
    target: value.target,
    tried_to_follow: value.tried_to_follow,
    helped: value.helped,
    submitted_at: value.submitted_at,
  };
}

export async function fetchModelFeedback(
  date: string,
  periodId: string,
  target: string
): Promise<ModelFeedbackResponse> {
  const response = await getClient().req.get(MODEL_FEEDBACK_ENDPOINT, {
    params: { date, period_id: periodId, target },
  });
  return { feedback: response.data?.feedback === null ? null : normalizeFeedback(response.data?.feedback) };
}

export async function submitModelFeedback(
  submission: ModelFeedbackSubmission
): Promise<ModelFeedbackDTO> {
  const response = await getClient().req.post(MODEL_FEEDBACK_ENDPOINT, submission);
  return normalizeFeedback(response.data);
}
