import { useUiStore, type ToastVariant } from '~/shared/stores/ui';

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export function useToast() {
  const uiStore = useUiStore();

  const toast = (input: ToastInput) => uiStore.toast(input);

  return {
    toast,
    info: (title: string, description?: string, duration?: number) =>
      toast({ title, description, variant: 'info', duration }),
    success: (title: string, description?: string, duration?: number) =>
      toast({ title, description, variant: 'success', duration }),
    warning: (title: string, description?: string, duration?: number) =>
      toast({ title, description, variant: 'warning', duration }),
    error: (title: string, description?: string, duration?: number) =>
      toast({ title, description, variant: 'error', duration }),
  };
}
