export type ThemeMode = 'light' | 'dark' | 'auto';

const DARK_THEME_HREF = '/dark.css';
export const THEME_CHANGE_EVENT = 'aw-theme-change';

function dispatchThemeChange(resolvedTheme: 'light' | 'dark'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: resolvedTheme }));
  }
}

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
  document.documentElement.dataset.theme = resolvedTheme;

  if (resolvedTheme === 'dark') {
    if (!existingThemeLink) {
      const themeLink = document.createElement('link');
      themeLink.href = DARK_THEME_HREF;
      themeLink.rel = 'stylesheet';
      themeLink.addEventListener('load', () => dispatchThemeChange(resolvedTheme), { once: true });
      document.querySelector('head')?.appendChild(themeLink);
      return;
    }
  } else {
    existingThemeLink?.remove();
  }

  dispatchThemeChange(resolvedTheme);
}

function resolveThemeTuple(variableName: string): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || null;
}

export function resolveThemeColor(variableName: string, fallback: string): string {
  const tuple = resolveThemeTuple(variableName);
  return tuple ? `rgb(${tuple})` : fallback;
}

export function resolveThemeColorAlpha(
  variableName: string,
  alpha: number,
  fallback: string
): string {
  const tuple = resolveThemeTuple(variableName);
  if (!tuple) {
    return fallback;
  }

  const [red, green, blue] = tuple.split(/\s+/).map(Number);
  if (![red, green, blue].every(channel => Number.isFinite(channel))) {
    return fallback;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
