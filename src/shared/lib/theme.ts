export type ThemeMode = 'light' | 'dark' | 'auto';

const DARK_THEME_HREF = '/dark.css';

export function detectPreferredTheme(): 'light' | 'dark' {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  return theme === 'auto' ? detectPreferredTheme() : theme;
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  const resolvedTheme = resolveTheme(theme);
  const existingThemeLink = document.querySelector(`link[href="${DARK_THEME_HREF}"]`);

  if (resolvedTheme === 'dark') {
    if (!existingThemeLink) {
      const themeLink = document.createElement('link');
      themeLink.href = DARK_THEME_HREF;
      themeLink.rel = 'stylesheet';
      document.querySelector('head')?.appendChild(themeLink);
    }
    return;
  }

  existingThemeLink?.remove();
}
