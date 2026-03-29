export interface CategoryDonutEntry {
  label: string;
  duration: number;
  category: string[] | null;
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

export function buildCategoryDonutChartData({
  categoryEntries,
  appEntries,
  selectedCategoryLabel,
  selectedAppLabel,
  normalColor,
  activeColor,
  hoverColor,
  dimColor,
}: {
  categoryEntries: CategoryDonutEntry[];
  appEntries: CategoryDonutEntry[];
  selectedCategoryLabel: string | null;
  selectedAppLabel: string | null;
  normalColor: string;
  activeColor: string;
  hoverColor: string;
  dimColor: string;
}) {
  return {
    labels: categoryEntries.map(entry => entry.label),
    datasets: [
      {
        label: 'Categories',
        data: categoryEntries.map(entry => Math.round((entry.duration / 3600) * 1000) / 1000),
        backgroundColor: categoryEntries.map(entry => {
          const isSelected = selectedCategoryLabel === entry.label;
          const isDimmed = selectedCategoryLabel && selectedCategoryLabel !== entry.label;
          return isSelected ? activeColor : isDimmed ? dimColor : normalColor;
        }),
        hoverBackgroundColor: categoryEntries.map(entry =>
          selectedCategoryLabel === entry.label ? activeColor : hoverColor
        ),
        borderWidth: categoryEntries.map(entry =>
          selectedCategoryLabel === entry.label ? 3 : 0
        ),
        borderColor: categoryEntries.map(entry =>
          selectedCategoryLabel === entry.label ? activeColor : 'transparent'
        ),
        hoverBorderColor: categoryEntries.map(entry =>
          selectedCategoryLabel === entry.label ? activeColor : 'transparent'
        ),
        borderRadius: 6,
        spacing: 5,
        hoverOffset: 6,
        radius: '68%',
        cutout: '34%',
      },
      {
        label: 'Applications',
        data: appEntries.map(entry => Math.round((entry.duration / 3600) * 1000) / 1000),
        backgroundColor: appEntries.map(entry => {
          const isSelected = selectedAppLabel === entry.label;
          const isDimmed = selectedAppLabel && selectedAppLabel !== entry.label;
          return isSelected ? activeColor : isDimmed ? dimColor : normalColor;
        }),
        hoverBackgroundColor: appEntries.map(entry =>
          selectedAppLabel === entry.label ? activeColor : hoverColor
        ),
        borderWidth: appEntries.map(entry => (selectedAppLabel === entry.label ? 3 : 0)),
        borderColor: appEntries.map(entry =>
          selectedAppLabel === entry.label ? activeColor : 'transparent'
        ),
        hoverBorderColor: appEntries.map(entry =>
          selectedAppLabel === entry.label ? activeColor : 'transparent'
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
