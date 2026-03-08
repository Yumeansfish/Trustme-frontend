import { useSettingsStore } from '~/features/settings/store/settings';
import { cleanCategory } from '~/features/categorization/lib/classes';
import type { Category } from '~/features/categorization/lib/classes';

function areWeTesting() {
  return process.env.NODE_ENV === 'test';
}

export function loadCategoryClasses(): Category[] {
  const settingsStore = useSettingsStore();
  return settingsStore.classes;
}

export function saveCategoryClasses(classes: Category[]) {
  if (areWeTesting()) {
    console.log('Not saving classes in test mode');
    return;
  }

  const settingsStore = useSettingsStore();
  settingsStore.update({ classes: classes.map(cleanCategory) });
  console.log('Saved classes', settingsStore.classes);
}
