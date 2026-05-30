import moment from 'moment';

import { getClient } from '~/app/lib/awclient';
import type {
  QuestionnaireBundleResponse,
  QuestionnaireInstance,
  QuestionnaireTemplate,
} from '~/features/questionnaire/lib/types';

export interface PendingQuestionnaireBundle {
  questionnaireTemplate: QuestionnaireTemplate | null;
  pendingQuestionnaireInstances: QuestionnaireInstance[];
  pendingDates: string[];
  earliestPendingDate: string;
  latestPendingDate: string;
}

export function logicalDateForQuestionnaireInstance(instance: QuestionnaireInstance): string {
  if (typeof instance.logical_date === 'string' && instance.logical_date.length >= 10) {
    return instance.logical_date.slice(0, 10);
  }
  const firstRecordedAt = instance.videos.find(video => typeof video.recorded_at === 'string' && video.recorded_at.length >= 10)
    ?.recorded_at;
  return firstRecordedAt ? firstRecordedAt.slice(0, 10) : '';
}

export function normalizePendingQuestionnaireBundle(
  payload: Partial<QuestionnaireBundleResponse>
): PendingQuestionnaireBundle {
  const questionnaireTemplate =
    payload.survey_template && Array.isArray(payload.survey_template.video_questions)
      ? (payload.survey_template as QuestionnaireTemplate)
      : null;
  const questionnaireInstances = Array.isArray(payload.survey_instances)
    ? (payload.survey_instances as QuestionnaireInstance[])
    : [];
  const pendingQuestionnaireInstances = questionnaireInstances.filter(instance => instance.status !== 'completed');
  const pendingDates = Array.from(
    new Set(
      pendingQuestionnaireInstances
        .map(instance => logicalDateForQuestionnaireInstance(instance))
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  ).sort((left, right) => left.localeCompare(right));

  return {
    questionnaireTemplate,
    pendingQuestionnaireInstances,
    pendingDates,
    earliestPendingDate: pendingDates[0] || '',
    latestPendingDate: pendingDates[pendingDates.length - 1] || '',
  };
}

export async function fetchPendingQuestionnaireBundle(): Promise<PendingQuestionnaireBundle> {
  const response = await getClient().req.get('/0/questionnaires');
  return normalizePendingQuestionnaireBundle(response.data as Partial<QuestionnaireBundleResponse>);
}

export function findNearestPendingDate(targetDate: string, pendingDates: string[]): string {
  if (!pendingDates.length) return '';
  const target = moment(targetDate, 'YYYY-MM-DD', true);
  if (!target.isValid()) return pendingDates[pendingDates.length - 1] || '';

  return [...pendingDates]
    .sort((left, right) => {
      const leftDiff = Math.abs(moment(left, 'YYYY-MM-DD', true).diff(target, 'days'));
      const rightDiff = Math.abs(moment(right, 'YYYY-MM-DD', true).diff(target, 'days'));
      if (leftDiff !== rightDiff) return leftDiff - rightDiff;
      return left.localeCompare(right);
    })[0];
}
