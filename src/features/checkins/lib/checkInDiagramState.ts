import type { CheckinAnswer, CheckinSession } from '~/shared/contracts/checkins.generated';

export interface CheckInDiagramPoint {
  x: number;
  y: number;
}

export interface CheckInDiagramSeries {
  questionId: string;
  label: string;
  data: CheckInDiagramPoint[];
}

export interface CheckInDiagramDomain {
  minX: number;
  maxX: number;
}

function isRenderableAnswer(answer: CheckinAnswer): boolean {
  if (!answer) return false;
  if (answer.status !== 'answered') return false;
  return Number.isFinite(answer.value);
}

function resolvePointX(timestamp: string): number {
  const localTimeMatch = timestamp.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (localTimeMatch) {
    const [, hours, minutes, seconds = '0'] = localTimeMatch;
    return Number(hours) + Number(minutes) / 60 + Number(seconds) / 3600;
  }

  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) {
    return 0;
  }

  return value.getHours() + value.getMinutes() / 60 + value.getSeconds() / 3600;
}

function sortQuestionId(left: string, right: string): number {
  const leftIsSleep = left.toUpperCase() === 'SLEEP';
  const rightIsSleep = right.toUpperCase() === 'SLEEP';
  if (leftIsSleep !== rightIsSleep) {
    return leftIsSleep ? -1 : 1;
  }

  const leftIndex = Number(left);
  const rightIndex = Number(right);
  if (Number.isFinite(leftIndex) && Number.isFinite(rightIndex)) {
    return leftIndex - rightIndex;
  }
  return left.localeCompare(right);
}

export function formatCheckInDiagramHourTick(value: number): string {
  const clamped = Math.max(0, Math.min(24, Number(value) || 0));
  const hours = Math.floor(clamped);
  const minutes = Math.round((clamped - hours) * 60);

  if (minutes === 0) {
    return `${hours.toString().padStart(2, '0')}:00`;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function buildCheckInDiagramSeries(sessions: CheckinSession[]): CheckInDiagramSeries[] {
  const byQuestion = new Map<string, CheckInDiagramSeries>();
  const sortedSessions = [...sessions].sort(
    (left, right) => new Date(left.started_at).getTime() - new Date(right.started_at).getTime()
  );

  for (const session of sortedSessions) {
    const pointX = resolvePointX(session.started_at);
    for (const answer of session.answers || []) {
      if (!isRenderableAnswer(answer)) {
        continue;
      }

      const questionId = String(answer.question_id || '');
      const label = String(answer.label || questionId || 'Question');
      const series = byQuestion.get(questionId) || {
        questionId,
        label,
        data: [],
      };
      series.data.push({
        x: pointX,
        y: Number(answer.value),
      });
      byQuestion.set(questionId, series);
    }
  }

  return [...byQuestion.values()]
    .sort((left, right) => sortQuestionId(left.questionId, right.questionId))
    .map(series => ({
      ...series,
      data: [...series.data].sort((left, right) => left.x - right.x),
    }));
}

export function buildCheckInDiagramDomain(sessions: CheckinSession[]): CheckInDiagramDomain {
  const points: number[] = [];

  for (const session of sessions) {
    const start = resolvePointX(session.started_at);
    const end = resolvePointX(session.ended_at);
    if (Number.isFinite(start)) points.push(start);
    if (Number.isFinite(end)) points.push(end);
  }

  if (points.length === 0) {
    return { minX: 0, maxX: 24 };
  }

  const rawMin = Math.min(...points);
  const rawMax = Math.max(...points);
  const padding = 0.25;
  const minX = Math.max(0, rawMin - padding);
  let maxX = Math.min(24, rawMax + padding);

  if (maxX - minX < 1) {
    maxX = Math.min(24, minX + 1);
  }

  return {
    minX,
    maxX,
  };
}
