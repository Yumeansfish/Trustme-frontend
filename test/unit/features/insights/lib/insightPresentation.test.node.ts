import type { ModelOutputResult } from '~/shared/contracts/model-output.generated';
import {
  insightProgress,
  insightBetterScoreLabel,
  insightScoreSymbol,
  insightScoreLabel,
} from '~/features/insights/lib/insightPresentation';

function result(id: string, score: number): ModelOutputResult {
  return {
    id,
    title: id,
    score,
    scale: {
      min: 0,
      max: 6,
      min_label: 'Low',
      max_label: 'High',
    },
  };
}

describe('Insights presentation', () => {
  test('uses question semantics when selecting a score symbol', () => {
    expect(insightScoreSymbol(result('productivity', 6))).toBe('☺');
    expect(insightScoreSymbol(result('stress_management', 6))).toBe('☺');
    expect(insightScoreSymbol(result('restfulness', 0))).toBe('☹');
    expect(insightScoreSymbol(result('arousal', 6))).toBe('●');
  });

  test('clamps progress to a safe visual range', () => {
    expect(insightProgress(result('mood_valence', -1))).toBe(0);
    expect(insightProgress(result('mood_valence', 8.4))).toBe(100);
  });

  test('maps normalized scores to the public semantic bands', () => {
    expect(insightScoreLabel(result('mood_valence', 1.99))).toBe('Negative mood');
    expect(insightScoreLabel(result('mood_valence', 2))).toBe('Neutral mood');
    expect(insightScoreLabel(result('mood_valence', 5))).toBe('Positive mood');
    expect(insightScoreLabel(result('stress_management', 1))).toBe('High stress');
    expect(insightScoreLabel(result('stress_management', 3))).toBe('Moderate stress');
    expect(insightScoreLabel(result('stress_management', 6))).toBe('Low stress');
    expect(insightScoreLabel(result('arousal', 1))).toBe('Low energy');
    expect(insightScoreLabel(result('arousal', 3))).toBe('Moderate energy');
    expect(insightScoreLabel(result('arousal', 6))).toBe('High energy');
  });

  test('maps each score to its next better semantic band', () => {
    expect(insightBetterScoreLabel(result('mood_valence', 1))).toBe('Neutral mood');
    expect(insightBetterScoreLabel(result('mood_valence', 3))).toBe('Positive mood');
    expect(insightBetterScoreLabel(result('stress_management', 1))).toBe('Moderate stress');
    expect(insightBetterScoreLabel(result('stress_management', 3))).toBe('Low stress');
    expect(insightBetterScoreLabel(result('stress_management', 6))).toBe('Low stress');
  });
});
