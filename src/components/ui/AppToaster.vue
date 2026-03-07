<template>
  <teleport to="body">
    <div class="pointer-events-none fixed right-0 top-0 z-[140] flex w-full justify-end p-4">
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
          class="pointer-events-auto flex items-start justify-between gap-3 rounded-lg border p-3 shadow-lg"
          role="status"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold">{{ toast.title }}</p>
            <p v-if="toast.description" class="mt-1 text-sm opacity-90">{{ toast.description }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-base leading-none opacity-70 transition hover:opacity-100"
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
import { useUiStore, type ToastVariant } from '~/stores/ui';

export default defineComponent({
  name: 'AppToaster',
  setup() {
    const uiStore = useUiStore();

    const toastClasses = (variant: ToastVariant) => {
      const classes: Record<ToastVariant, string> = {
        default: 'border-slate-200 bg-white text-slate-900',
        info: 'border-blue-200 bg-blue-50 text-blue-900',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        error: 'border-rose-200 bg-rose-50 text-rose-900',
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
