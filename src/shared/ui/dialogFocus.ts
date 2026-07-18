import { nextTick, type Ref } from 'vue';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function createDialogFocusController(panel: Ref<HTMLElement | null>) {
  let previousFocus: HTMLElement | null = null;

  const focusableElements = (): HTMLElement[] => {
    if (!panel.value) return [];
    return Array.from(panel.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      element => element.getAttribute('aria-hidden') !== 'true'
    );
  };

  const activate = async (preferredSelector?: string): Promise<void> => {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    const preferred = preferredSelector
      ? panel.value?.querySelector<HTMLElement>(preferredSelector)
      : null;
    preferred?.focus();
    if (preferred) return;
    (focusableElements()[0] || panel.value)?.focus();
  };

  const deactivate = (): void => {
    const target = previousFocus;
    previousFocus = null;
    if (target?.isConnected) target.focus();
  };

  const trapTab = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;
    const focusable = focusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      panel.value?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panel.value?.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return { activate, deactivate, trapTab };
}
