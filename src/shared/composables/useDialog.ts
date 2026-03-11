import { useUiStore } from '~/shared/stores/ui';

interface ConfirmInput {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

interface PromptInput extends ConfirmInput {
  defaultValue?: string;
  placeholder?: string;
}

export function useDialog() {
  const uiStore = useUiStore();

  return {
    confirm: (input: ConfirmInput) => uiStore.confirm(input),
    prompt: (input: PromptInput) => uiStore.prompt(input),
  };
}
