import { resolveThemeToggleState } from '~/features/settings/lib/themeToggleState';

describe('resolveThemeToggleState', () => {
  const originalWindow = (global as typeof globalThis & { window?: typeof window }).window;

  afterEach(() => {
    if (originalWindow) {
      (global as typeof globalThis & { window?: typeof window }).window = originalWindow;
      return;
    }

    delete (global as typeof globalThis & { window?: typeof window }).window;
  });

  it('switches from explicit dark mode to light mode', () => {
    expect(resolveThemeToggleState('dark')).toEqual({
      nextTheme: 'light',
      icon: 'sun',
      label: 'Light mode',
      title: 'Switch to light mode',
      notice: null,
    });
  });

  it('makes auto-mode exit explicit when the system theme is dark', () => {
    (global as typeof globalThis & { window?: typeof window }).window = {
      matchMedia: jest.fn().mockImplementation(() => ({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        onchange: null,
        dispatchEvent: jest.fn(),
      })),
    } as typeof window;

    expect(resolveThemeToggleState('auto')).toEqual({
      nextTheme: 'light',
      icon: 'sun',
      label: 'Pin Light mode',
      title: 'Switch to light mode and stop following the system theme',
      notice: {
        title: 'Auto theme turned off',
        description:
          'Light mode is now pinned. Open settings if you want to follow the system theme again.',
      },
    });
  });

  it('makes auto-mode exit explicit when the system theme is light', () => {
    (global as typeof globalThis & { window?: typeof window }).window = {
      matchMedia: jest.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        onchange: null,
        dispatchEvent: jest.fn(),
      })),
    } as typeof window;

    expect(resolveThemeToggleState('auto')).toEqual({
      nextTheme: 'dark',
      icon: 'moon',
      label: 'Pin Dark mode',
      title: 'Switch to dark mode and stop following the system theme',
      notice: {
        title: 'Auto theme turned off',
        description:
          'Dark mode is now pinned. Open settings if you want to follow the system theme again.',
      },
    });
  });
});
