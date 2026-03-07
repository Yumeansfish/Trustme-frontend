<template>
  <teleport to="body">
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        @click="onOverlayClick"
      >
        <div
          :class="panelClass"
          class="w-full rounded-2xl border border-slate-200 bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div class="min-w-0">
              <h3 class="text-lg font-semibold text-slate-900">{{ title }}</h3>
              <p v-if="description" class="mt-1 text-sm leading-relaxed text-slate-600">
                {{ description }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close modal"
              @click="close"
            >
              ×
            </button>
          </div>

          <div class="max-h-[75vh] overflow-y-auto px-6 py-5">
            <slot />
          </div>

          <div v-if="$slots.footer" class="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted } from 'vue';

export default defineComponent({
  name: 'AppModal',
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    panelClass: {
      type: String,
      default: 'max-w-2xl',
    },
    closeOnOverlay: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:open', 'close'],
  setup(props, { emit }) {
    const close = () => {
      emit('update:open', false);
      emit('close');
    };

    const onOverlayClick = (event: MouseEvent) => {
      if (props.closeOnOverlay && event.target === event.currentTarget) {
        close();
      }
    };

    const onKeydown = (event: KeyboardEvent) => {
      if (props.open && event.key === 'Escape') {
        close();
      }
    };

    onMounted(() => {
      window.addEventListener('keydown', onKeydown);
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', onKeydown);
    });

    return {
      close,
      onOverlayClick,
    };
  },
});
</script>
