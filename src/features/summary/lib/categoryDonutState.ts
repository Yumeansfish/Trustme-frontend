export interface CategoryDonutEntry {
  label: string;
  duration: number;
  category: string[] | null;
  isOther?: boolean;
  groupedCount?: number;
}

export const CATEGORY_DONUT_MINIMUM_VISIBLE_SHARE = 0.01;

export function formatCategoryDonutDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0m';
  }
  if (seconds < 60) {
    return '<1m';
  }

  const days = Math.floor(seconds / 86400);
  if (days > 0) {
    const hrs = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hrs}h`;
  }

  const hrs = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
}

export function calculateCategoryDonutPercentage(seconds: number, totalSeconds: number): number {
  if (
    !Number.isFinite(seconds) ||
    !Number.isFinite(totalSeconds) ||
    seconds <= 0 ||
    totalSeconds <= 0
  ) {
    return 0;
  }

  return Math.min(100, Math.round((seconds / totalSeconds) * 100));
}

function categoryLabel(category: string[] | null | undefined): string {
  return Array.isArray(category) && category.length > 0 ? category.join(' > ') : 'Uncategorized';
}

export function buildCategoryDonutCategoryEntries(
  entries: Array<{ duration: number; data?: { $category?: string[] | null } }> | null | undefined
): CategoryDonutEntry[] {
  return (entries || [])
    .filter(entry => entry.duration > 0)
    .map(entry => ({
      label: categoryLabel(entry.data?.$category),
      duration: entry.duration,
      category: entry.data?.$category || null,
    }));
}

export function buildCategoryDonutAppEntries(
  entries:
    | Array<{ duration: number; data?: { app?: string | null; $category?: string[] | null } }>
    | null
    | undefined
): CategoryDonutEntry[] {
  return (entries || [])
    .filter(entry => entry.duration > 0)
    .map(entry => ({
      label: entry.data?.app || 'Unknown app',
      duration: entry.duration,
      category: entry.data?.$category || null,
    }));
}

export function groupSmallCategoryDonutEntries(
  entries: CategoryDonutEntry[],
  selectedLabel: string | null
): CategoryDonutEntry[] {
  const totalDuration = entries.reduce(
    (sum, entry) =>
      Number.isFinite(entry.duration) && entry.duration > 0 ? sum + entry.duration : sum,
    0
  );
  if (totalDuration <= 0) return entries;

  const visibleEntries: CategoryDonutEntry[] = [];
  const groupedEntries: CategoryDonutEntry[] = [];

  entries.forEach(entry => {
    const isSelected = selectedLabel === entry.label;
    const isSmall = entry.duration / totalDuration < CATEGORY_DONUT_MINIMUM_VISIBLE_SHARE;
    (isSmall && !isSelected ? groupedEntries : visibleEntries).push(entry);
  });

  if (groupedEntries.length === 0) return entries;

  visibleEntries.push({
    label: 'Other',
    duration: groupedEntries.reduce((sum, entry) => sum + entry.duration, 0),
    category: null,
    isOther: true,
    groupedCount: groupedEntries.length,
  });
  return visibleEntries;
}

export function buildCategoryDonutChartData({
  categoryEntries,
  appEntries,
  selectedCategoryLabel,
  selectedAppLabel,
  normalColor,
  activeColor,
  hoverColor,
  dimColor,
  otherColor,
  otherHoverColor,
}: {
  categoryEntries: CategoryDonutEntry[];
  appEntries: CategoryDonutEntry[];
  selectedCategoryLabel: string | null;
  selectedAppLabel: string | null;
  normalColor: string;
  activeColor: string;
  hoverColor: string;
  dimColor: string;
  otherColor: string;
  otherHoverColor: string;
}) {
  return {
    labels: categoryEntries.map(entry => entry.label),
    datasets: [
      {
        label: 'Categories',
        data: categoryEntries.map(entry => entry.duration),
        backgroundColor: categoryEntries.map(entry => {
          if (entry.isOther) return otherColor;
          const isSelected = selectedCategoryLabel === entry.label;
          const isDimmed = selectedCategoryLabel && selectedCategoryLabel !== entry.label;
          return isSelected ? activeColor : isDimmed ? dimColor : normalColor;
        }),
        hoverBackgroundColor: categoryEntries.map(entry =>
          entry.isOther
            ? otherHoverColor
            : selectedCategoryLabel === entry.label
              ? activeColor
              : hoverColor
        ),
        borderWidth: categoryEntries.map(entry =>
          !entry.isOther && selectedCategoryLabel === entry.label ? 3 : 0
        ),
        borderColor: categoryEntries.map(entry =>
          !entry.isOther && selectedCategoryLabel === entry.label ? activeColor : 'transparent'
        ),
        hoverBorderColor: categoryEntries.map(entry =>
          !entry.isOther && selectedCategoryLabel === entry.label ? activeColor : 'transparent'
        ),
        borderRadius: 6,
        spacing: 5,
        hoverOffset: 6,
        radius: '68%',
        cutout: '34%',
      },
      {
        label: 'Applications',
        data: appEntries.map(entry => entry.duration),
        backgroundColor: appEntries.map(entry => {
          if (entry.isOther) return otherColor;
          const isSelected = selectedAppLabel === entry.label;
          const isDimmed = selectedAppLabel && selectedAppLabel !== entry.label;
          return isSelected ? activeColor : isDimmed ? dimColor : normalColor;
        }),
        hoverBackgroundColor: appEntries.map(entry =>
          entry.isOther
            ? otherHoverColor
            : selectedAppLabel === entry.label
              ? activeColor
              : hoverColor
        ),
        borderWidth: appEntries.map(entry =>
          !entry.isOther && selectedAppLabel === entry.label ? 3 : 0
        ),
        borderColor: appEntries.map(entry =>
          !entry.isOther && selectedAppLabel === entry.label ? activeColor : 'transparent'
        ),
        hoverBorderColor: appEntries.map(entry =>
          !entry.isOther && selectedAppLabel === entry.label ? activeColor : 'transparent'
        ),
        borderRadius: 6,
        spacing: 5,
        hoverOffset: 6,
        radius: '100%',
        cutout: '78%',
      },
    ],
  };
}
