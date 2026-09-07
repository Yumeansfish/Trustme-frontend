import { scoreSymbolAt } from '~/shared/lib/scoreSymbol';

describe('scoreSymbolAt', () => {
  test('uses the same monochrome scale for positive and reversed scores', () => {
    expect(scoreSymbolAt(0)).toBe('☹');
    expect(scoreSymbolAt(4)).toBe('☺');
    expect(scoreSymbolAt(0, 'negative')).toBe('☺');
    expect(scoreSymbolAt(4, 'negative')).toBe('☹');
  });

  test('keeps intensity neutral while using the same single-color symbol style', () => {
    expect(scoreSymbolAt(0, 'intensity')).toBe('○');
    expect(scoreSymbolAt(4, 'intensity')).toBe('●');
  });

  test('clamps invalid levels to a drawable symbol', () => {
    expect(scoreSymbolAt(-5)).toBe('☹');
    expect(scoreSymbolAt(20)).toBe('☺');
    expect(scoreSymbolAt(Number.NaN)).toBe('☹');
  });
});
