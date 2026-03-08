<template>
  <teleport to="body">
    <div class="aw-toast-shell">
      <transition-group
        tag="div"
        class="flex w-full max-w-sm flex-col gap-2"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="translate-y-1 opacity-0"
      >
        <div
          v-for="toast in uiStore.toasts"
          :key="toast.id"
          :class="toastClasses(toast.variant)"
          class="aw-toast"
          role="status"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold">{{ toast.title }}</p>
            <p v-if="toast.description" class="mt-1 text-sm opacity-90">{{ toast.description }}</p>
          </div>
          <button
            type="button"
            class="aw-icon-button h-7 w-7 shrink-0 border border-transparent text-base leading-none opacity-70 hover:opacity-100"
            aria-label="Dismiss notification"
            @click="uiStore.dismissToast(toast.id)"
          >
            ×
          </button>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useUiStore, type ToastVariant } from '~/shared/stores/ui';

export default defineComponent({
  name: 'AppToaster',
  setup() {
    const uiStore = useUiStore();

    const toastClasses = (variant: ToastVariant) => {
      const classes: Record<ToastVariant, string> = {
        default: 'aw-toast-default',
        info: 'aw-toast-info',
        success: 'aw-toast-success',
        warning: 'aw-toast-warning',
        error: 'aw-toast-error',
      };

      return classes[variant] || classes.default;
    };

    return {
      uiStore,
      toastClasses,
    };
  },
});
</script>
