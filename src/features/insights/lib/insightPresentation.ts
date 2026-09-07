import type { ModelOutputResult } from '~/shared/contracts/model-output.generated';
import { scoreSymbolAt, type ScoreSymbolDirection } from '~/shared/lib/scoreSymbol';

const INTENSITY_SCORES = new Set(['arousal']);

export const INSIGHT_RESULT_ORDER = [
  'mood_valence',
  'arousal',
  'restfulness',
  'stress_management',
  'productivity',
  'engagement',
] as const;

const SCORE_LABELS: Record<string, readonly [string, string, string]> = {
  mood_valence: ['Negative mood', 'Neutral mood', 'Positive mood'],
  arousal: ['Low energy', 'Moderate energy', 'High energy'],
  restfulness: ['High fatigue', 'Moderate fatigue', 'Low fatigue'],
  stress_management: ['High stress', 'Moderate stress', 'Low stress'],
  productivity: ['Low productivity', 'Moderate productivity', 'High productivity'],
  engagement: ['Low engagement', 'Moderate engagement', 'High engagement'],
  overall_wellbeing: ['Low well-being', 'Moderate well-being', 'High well-being'],
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function insightProgress(result: ModelOutputResult): number {
  const range = result.scale.max - result.scale.min;
  if (!Number.isFinite(range) || range <= 0 || !Number.isFinite(result.score)) {
    return 0;
  }
  return clamp(((result.score - result.scale.min) / range) * 100, 0, 100);
}

export function insightScoreLabel(result: ModelOutputResult): string {
  if (!Number.isFinite(result.score)) return '';
  const labels = SCORE_LABELS[result.id];
  if (!labels) return '';
  if (result.score < 2) return labels[0];
  if (result.score < 5) return labels[1];
  return labels[2];
}

export function insightBetterScoreLabel(result: ModelOutputResult): string {
  if (!Number.isFinite(result.score)) return '';
  const labels = SCORE_LABELS[result.id];
  if (!labels) return '';
  if (result.score < 2) return labels[1];
  return labels[2];
}

function emojiIndex(progress: number): number {
  if (progress <= 15) return 0;
  if (progress <= 35) return 1;
  if (progress <= 65) return 2;
  if (progress <= 85) return 3;
  return 4;
}

export function insightScoreSymbol(result: ModelOutputResult): string {
  const index = emojiIndex(insightProgress(result));
  const direction: ScoreSymbolDirection = INTENSITY_SCORES.has(result.id)
    ? 'intensity'
    : 'positive';
  return scoreSymbolAt(index, direction);
}
