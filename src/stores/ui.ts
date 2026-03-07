import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';

export type ToastVariant = 'default' | 'info' | 'success' | 'warning' | 'error';

interface ToastPayload {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

type DialogMode = 'confirm' | 'prompt';

interface DialogOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  placeholder?: string;
}

export interface DialogState {
  open: boolean;
  mode: DialogMode;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  placeholder: string;
  value: string;
}

type DialogResult = boolean | string | null;
type DialogResolver = ((result: DialogResult) => void) | null;

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<ToastMessage[]>([]);
  const dialogResolver = ref<DialogResolver>(null);
  const dismissTimers = new Map<number, ReturnType<typeof setTimeout>>();

  let nextToastId = 1;

  const dialog = reactive<DialogState>({
    open: false,
    mode: 'confirm',
    title: '',
    description: '',
    confirmText: 'Continue',
    cancelText: 'Cancel',
    placeholder: '',
    value: '',
  });

  function dismissToast(id: number) {
    const timer = dismissTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimers.delete(id);
    }
    toasts.value = toasts.value.filter(toast => toast.id !== id);
  }

  function toast(payload: ToastPayload) {
    const id = nextToastId++;
    const entry: ToastMessage = {
      id,
      title: payload.title,
      description: payload.description,
      variant: payload.variant ?? 'default',
      duration: payload.duration ?? 4500,
    };

    toasts.value = [...toasts.value, entry];

    if (entry.duration > 0) {
      const timer = setTimeout(() => dismissToast(id), entry.duration);
      dismissTimers.set(id, timer);
    }

    return id;
  }

  function closeDialog(result: DialogResult) {
    const resolver = dialogResolver.value;
    dialogResolver.value = null;
    dialog.open = false;
    if (resolver) {
      resolver(result);
    }
  }

  function openDialog(mode: DialogMode, options: DialogOptions) {
    if (dialog.open && dialogResolver.value) {
      closeDialog(dialog.mode === 'prompt' ? null : false);
    }

    dialog.mode = mode;
    dialog.title = options.title;
    dialog.description = options.description ?? '';
    dialog.confirmText = options.confirmText ?? (mode === 'prompt' ? 'Save' : 'Continue');
    dialog.cancelText = options.cancelText ?? 'Cancel';
    dialog.placeholder = options.placeholder ?? '';
    dialog.value = options.defaultValue ?? '';
    dialog.open = true;
  }

  function confirm(options: DialogOptions): Promise<boolean> {
    openDialog('confirm', options);
    return new Promise(resolve => {
      dialogResolver.value = result => resolve(result === true);
    });
  }

  function prompt(options: DialogOptions): Promise<string | null> {
    openDialog('prompt', options);
    return new Promise(resolve => {
      dialogResolver.value = result => resolve(typeof result === 'string' ? result : null);
    });
  }

  function submitDialog() {
    if (!dialog.open) {
      return;
    }

    if (dialog.mode === 'prompt') {
      closeDialog(dialog.value);
    } else {
      closeDialog(true);
    }
  }

  function cancelDialog() {
    if (!dialog.open) {
      return;
    }
    closeDialog(dialog.mode === 'prompt' ? null : false);
  }

  return {
    toasts,
    dialog,
    toast,
    dismissToast,
    confirm,
    prompt,
    submitDialog,
    cancelDialog,
  };
});
