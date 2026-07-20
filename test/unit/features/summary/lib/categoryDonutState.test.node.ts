import {
  buildCategoryDonutChartData,
  calculateCategoryDonutPercentage,
  formatCategoryDonutDuration,
  groupSmallCategoryDonutEntries,
  type CategoryDonutEntry,
} from '~/features/summary/lib/categoryDonutState';

const COLORS = {
  normalColor: '#111111',
  activeColor: '#222222',
  hoverColor: '#333333',
  dimColor: '#444444',
  otherColor: '#555555',
  otherHoverColor: '#666666',
};

function entry(label: string, duration: number): CategoryDonutEntry {
  return { label, duration, category: null };
}

describe('categoryDonutState', () => {
  test('keeps a 1.7 second slice drawable just after midnight', () => {
    const result = buildCategoryDonutChartData({
      categoryEntries: [entry('Work', 1.7)],
      appEntries: [entry('Code', 1.7)],
      selectedCategoryLabel: null,
      selectedAppLabel: null,
      ...COLORS,
    });

    expect(result.datasets[0].data).toEqual([1.7]);
    expect(result.datasets[1].data).toEqual([1.7]);
  });

  test('keeps exact second durations for a just-after-midnight chart', () => {
    const categoryEntries = [entry('Work', 9.8)];
    const appEntries = [entry('Code', 6.1), entry('Browser', 3.7)];

    const result = buildCategoryDonutChartData({
      categoryEntries,
      appEntries,
      selectedCategoryLabel: null,
      selectedAppLabel: null,
      ...COLORS,
    });

    expect(result.datasets[0].data).toEqual([9.8]);
    expect(result.datasets[1].data).toEqual([6.1, 3.7]);
    expect(result.datasets[1].data.reduce((sum, duration) => sum + duration, 0)).toBeCloseTo(9.8);
    expect(calculateCategoryDonutPercentage(result.datasets[0].data[0], 9.8)).toBe(100);
    expect(calculateCategoryDonutPercentage(10.8, 9.8)).toBe(100);
  });

  test('formats positive sub-minute activity without presenting it as zero', () => {
    expect(formatCategoryDonutDuration(0)).toBe('0m');
    expect(formatCategoryDonutDuration(0.1)).toBe('<1m');
    expect(formatCategoryDonutDuration(59.9)).toBe('<1m');
    expect(formatCategoryDonutDuration(60)).toBe('1m');
  });

  test('keeps long-range center labels compact', () => {
    expect(formatCategoryDonutDuration(24 * 3600)).toBe('1d 0h');
    expect(formatCategoryDonutDuration(32 * 3600 + 45 * 60)).toBe('1d 8h');
    expect(formatCategoryDonutDuration(365 * 24 * 3600)).toBe('365d 0h');
  });

  test('keeps every slice at or above one percent without a top-item limit', () => {
    const entries = Array.from({ length: 12 }, (_, index) => entry(`Item ${index + 1}`, 100));

    const result = groupSmallCategoryDonutEntries(entries, null);

    expect(result).toHaveLength(12);
    expect(result.some(item => item.isOther)).toBe(false);
  });

  test('groups only slices below one percent and keeps the exact boundary visible', () => {
    const entries = [
      entry('Large', 9800),
      entry('Exactly one percent', 100),
      entry('Tiny one', 40),
      entry('Tiny two', 60),
    ];

    const result = groupSmallCategoryDonutEntries(entries, null);

    expect(result.map(item => item.label)).toEqual(['Large', 'Exactly one percent', 'Other']);
    expect(result[2]).toMatchObject({ duration: 100, isOther: true, groupedCount: 2 });
  });

  test('keeps a selected sub-one-percent slice separate from Other', () => {
    const entries = [entry('Large', 9900), entry('Selected tiny', 40), entry('Other tiny', 60)];

    const result = groupSmallCategoryDonutEntries(entries, 'Selected tiny');

    expect(result.map(item => item.label)).toEqual(['Large', 'Selected tiny', 'Other']);
    expect(result[2]).toMatchObject({ duration: 60, isOther: true, groupedCount: 1 });
  });

  test('uses the neutral color for a grouped Other slice', () => {
    const otherEntry: CategoryDonutEntry = {
      ...entry('Other', 10),
      isOther: true,
      groupedCount: 2,
    };

    const result = buildCategoryDonutChartData({
      categoryEntries: [entry('Work', 90), otherEntry],
      appEntries: [],
      selectedCategoryLabel: null,
      selectedAppLabel: null,
      ...COLORS,
    });

    expect(result.datasets[0].backgroundColor).toEqual([COLORS.normalColor, COLORS.otherColor]);
    expect(result.datasets[0].hoverBackgroundColor).toEqual([
      COLORS.hoverColor,
      COLORS.otherHoverColor,
    ]);
  });
});
