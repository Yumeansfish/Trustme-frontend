import { useSettingsStore } from '~/features/settings/store/settings';
import { cleanCategory } from '~/features/categorization/lib/classes';
import type { Category } from '~/features/categorization/lib/classes';
import { isTestRuntime } from '~/app/config/runtime';

export function loadCategoryClasses(): Category[] {
  const settingsStore = useSettingsStore();
  return settingsStore.classes.map(cleanCategory);
}

export function saveCategoryClasses(classes: Category[]) {
  if (isTestRuntime) {
    return;
  }

  const settingsStore = useSettingsStore();
  settingsStore.update({ classes: classes.map(cleanCategory) });
}
