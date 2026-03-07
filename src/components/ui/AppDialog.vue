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
        class="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        @click="onOverlayClick"
      >
        <div class="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div class="space-y-3 px-6 py-5">
            <h3 class="text-lg font-semibold text-slate-900">{{ uiStore.dialog.title }}</h3>
            <p v-if="uiStore.dialog.description" class="text-sm leading-relaxed text-slate-600">
              {{ uiStore.dialog.description }}
            </p>

            <input
              v-if="uiStore.dialog.mode === 'prompt'"
              ref="promptInput"
              v-model="uiStore.dialog.value"
              :placeholder="uiStore.dialog.placeholder"
              type="text"
              class="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
              @keydown.enter.prevent="uiStore.submitDialog()"
            />
          </div>

          <div class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              @click="uiStore.cancelDialog()"
            >
              {{ uiStore.dialog.cancelText }}
            </button>
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-md border border-violet-500 bg-violet-600 px-4 text-sm font-medium text-white transition hover:bg-violet-700"
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
import { useUiStore } from '~/stores/ui';

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
