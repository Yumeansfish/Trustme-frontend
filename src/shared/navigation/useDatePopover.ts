import { nextTick, onBeforeUnmount, onMounted, type Ref } from 'vue';

interface DatePopoverOptions {
  isOpen: Ref<boolean>;
  root: Ref<HTMLElement | null>;
  trigger: Ref<HTMLButtonElement | null>;
  onClose?: () => void;
}

export function useDatePopover({ isOpen, root, trigger, onClose }: DatePopoverOptions) {
  const closePopover = (restoreFocus = false) => {
    const wasOpen = isOpen.value;
    isOpen.value = false;
    if (wasOpen) onClose?.();
    if (restoreFocus) void nextTick(() => trigger.value?.focus());
  };

  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (!root.value || !target || root.value.contains(target)) return;
    closePopover();
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen.value) closePopover(true);
  };

  onMounted(() => {
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleEscape);
  });

  return { closePopover };
}
