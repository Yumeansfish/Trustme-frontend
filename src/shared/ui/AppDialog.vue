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
        <div
          ref="dialogPanel"
          class="aw-dialog-panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="uiStore.dialog.description ? descriptionId : undefined"
          tabindex="-1"
        >
          <div class="space-y-3 px-6 py-5">
            <h3 :id="titleId" class="text-lg font-semibold text-foreground-strong">
              {{ uiStore.dialog.title }}
            </h3>
            <p
              v-if="uiStore.dialog.description"
              :id="descriptionId"
              class="text-sm leading-relaxed text-foreground-muted"
            >
              {{ uiStore.dialog.description }}
            </p>

            <ui-input
              v-if="uiStore.dialog.mode === 'prompt'"
              v-model="uiStore.dialog.value"
              :placeholder="uiStore.dialog.placeholder"
              type="text"
              class="aw-input"
              @keydown.enter.prevent="uiStore.submitDialog()"
            />
          </div>

          <div class="flex justify-end gap-2 border-t border-muted px-6 py-4">
            <ui-button
              type="button"
              class="aw-btn aw-btn-md aw-btn-secondary"
              @click="uiStore.cancelDialog()"
            >
              {{ uiStore.dialog.cancelText }}
            </ui-button>
            <ui-button
              type="button"
              class="aw-btn aw-btn-md aw-btn-primary"
              data-dialog-primary
              @click="uiStore.submitDialog()"
            >
              {{ uiStore.dialog.confirmText }}
            </ui-button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, useId, watch } from 'vue';
import { useUiStore } from '~/shared/stores/ui';
import { createDialogFocusController } from '~/shared/ui/dialogFocus';

export default defineComponent({
  name: 'AppDialog',
  setup() {
    const uiStore = useUiStore();
    const dialogPanel = ref<HTMLElement | null>(null);
    const titleId = `dialog-title-${useId()}`;
    const descriptionId = `dialog-description-${useId()}`;
    const focus = createDialogFocusController(dialogPanel);

    const onOverlayClick = (event: MouseEvent) => {
      if (event.target === event.currentTarget) {
        uiStore.cancelDialog();
      }
    };

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && uiStore.dialog.open) {
        event.preventDefault();
        uiStore.cancelDialog();
        return;
      }
      if (uiStore.dialog.open) focus.trapTab(event);
    };

    watch(
      () => uiStore.dialog.open,
      open => {
        if (open) {
          const selector = uiStore.dialog.mode === 'prompt' ? 'input' : '[data-dialog-primary]';
          void focus.activate(selector).then(() => {
            if (uiStore.dialog.mode === 'prompt') {
              dialogPanel.value?.querySelector<HTMLInputElement>('input')?.select();
            }
          });
        } else {
          focus.deactivate();
        }
      }
    );

    onMounted(() => {
      window.addEventListener('keydown', onKeydown);
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', onKeydown);
      focus.deactivate();
    });

    return {
      descriptionId,
      dialogPanel,
      uiStore,
      onOverlayClick,
      titleId,
    };
  },
});
</script>
