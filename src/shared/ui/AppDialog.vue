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
        v-if="uiStore.dialog.open"
        class="aw-overlay aw-dialog-shell"
        @click="onOverlayClick"
      >
        <div class="aw-dialog-panel">
          <div class="space-y-3 px-6 py-5">
            <h3 class="text-lg font-semibold text-foreground-strong">{{ uiStore.dialog.title }}</h3>
            <p v-if="uiStore.dialog.description" class="text-sm leading-relaxed text-foreground-muted">
              {{ uiStore.dialog.description }}
            </p>

            <input
              v-if="uiStore.dialog.mode === 'prompt'"
              ref="promptInput"
              v-model="uiStore.dialog.value"
              :placeholder="uiStore.dialog.placeholder"
              type="text"
              class="aw-input"
              @keydown.enter.prevent="uiStore.submitDialog()"
            />
          </div>

          <div class="flex justify-end gap-2 border-t border-muted px-6 py-4">
            <button
              type="button"
              class="aw-btn aw-btn-md aw-btn-secondary"
              @click="uiStore.cancelDialog()"
            >
              {{ uiStore.dialog.cancelText }}
            </button>
            <button
              type="button"
              class="aw-btn aw-btn-md aw-btn-primary"
              @click="uiStore.submitDialog()"
            >
              {{ uiStore.dialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts">
import { defineComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useUiStore } from '~/shared/stores/ui';

export default defineComponent({
  name: 'AppDialog',
  setup() {
    const uiStore = useUiStore();
    const promptInput = ref<HTMLInputElement | null>(null);

    const onOverlayClick = (event: MouseEvent) => {
      if (event.target === event.currentTarget) {
        uiStore.cancelDialog();
      }
    };

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && uiStore.dialog.open) {
        uiStore.cancelDialog();
      }
    };

    watch(
      () => uiStore.dialog.open,
      async open => {
        if (open && uiStore.dialog.mode === 'prompt') {
          await nextTick();
          promptInput.value?.focus();
          promptInput.value?.select();
        }
      }
    );

    onMounted(() => {
      window.addEventListener('keydown', onKeydown);
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', onKeydown);
    });

    return {
      uiStore,
      promptInput,
      onOverlayClick,
    };
  },
});
</script>
