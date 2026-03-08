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
        class="aw-overlay aw-modal-shell"
        @click="onOverlayClick"
      >
        <div
          :class="panelClass"
          class="aw-modal-panel"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-start justify-between gap-4 border-b border-muted px-6 py-4">
            <div class="min-w-0">
              <h3 class="text-lg font-semibold text-foreground-strong">{{ title }}</h3>
              <p v-if="description" class="mt-1 text-sm leading-relaxed text-foreground-muted">
                {{ description }}
              </p>
            </div>
            <button
              type="button"
              class="aw-icon-button h-8 w-8 shrink-0"
              aria-label="Close modal"
              @click="close"
            >
              ×
            </button>
          </div>

          <div class="aw-modal-body">
            <slot />
          </div>

          <div
            v-if="$slots.footer"
            class="flex flex-wrap justify-end gap-2 border-t border-muted px-6 py-4"
          >
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
