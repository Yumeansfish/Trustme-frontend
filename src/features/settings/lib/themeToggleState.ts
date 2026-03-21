import { resolveTheme, type ThemeMode } from '~/shared/lib/theme';

export interface ThemeToggleNotice {
  title: string;
  description: string;
}

export interface ThemeToggleState {
  nextTheme: 'light' | 'dark';
  icon: 'sun' | 'moon';
  label: string;
  title: string;
  notice: ThemeToggleNotice | null;
}

function capitalizeTheme(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? 'Dark' : 'Light';
}

export function resolveThemeToggleState(theme: ThemeMode): ThemeToggleState {
  const resolvedTheme = resolveTheme(theme);
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const icon = nextTheme === 'dark' ? 'moon' : 'sun';
  const themeLabel = `${capitalizeTheme(nextTheme)} mode`;

  if (theme === 'auto') {
    return {
      nextTheme,
      icon,
      label: `Pin ${themeLabel}`,
      title: `Switch to ${nextTheme} mode and stop following the system theme`,
      notice: {
        title: 'Auto theme turned off',
        description: `${themeLabel} is now pinned. Open settings if you want to follow the system theme again.`,
      },
    };
  }

  return {
    nextTheme,
    icon,
    label: themeLabel,
    title: `Switch to ${nextTheme} mode`,
    notice: null,
  };
}
