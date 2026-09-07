export type ScoreSymbolDirection = 'positive' | 'negative' | 'intensity';

const POSITIVE_SYMBOLS = ['☹', '◔', '◑', '◕', '☺'] as const;
const NEGATIVE_SYMBOLS = ['☺', '◕', '◑', '◔', '☹'] as const;
const INTENSITY_SYMBOLS = ['○', '◔', '◑', '◕', '●'] as const;

export function scoreSymbolAt(index: number, direction: ScoreSymbolDirection = 'positive'): string {
  const normalizedIndex = Number.isFinite(index)
    ? Math.min(POSITIVE_SYMBOLS.length - 1, Math.max(0, Math.round(index)))
    : 0;
  const symbols =
    direction === 'negative'
      ? NEGATIVE_SYMBOLS
      : direction === 'intensity'
        ? INTENSITY_SYMBOLS
        : POSITIVE_SYMBOLS;
  return symbols[normalizedIndex];
}
