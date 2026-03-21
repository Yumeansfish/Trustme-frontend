export type ActiveShortcut = {
  key: string;
  title: string;
  icon: string;
  pattern: string;
  isOther?: boolean;
};

export type ActivePatternSelection = {
  selectedShortcutKey: string;
  customPattern: string;
};

export function resolveActivePatternSelection(
  pattern: string,
  shortcuts: ActiveShortcut[]
): ActivePatternSelection {
  const normalizedPattern = pattern || '';
  const matchedShortcut = shortcuts.find(
    shortcut => !shortcut.isOther && shortcut.pattern === normalizedPattern
  );

  if (matchedShortcut) {
    return {
      selectedShortcutKey: matchedShortcut.key,
      customPattern: '',
    };
  }

  if (!normalizedPattern) {
    return {
      selectedShortcutKey: '',
      customPattern: '',
    };
  }

  return {
    selectedShortcutKey: 'other',
    customPattern: normalizedPattern,
  };
}
