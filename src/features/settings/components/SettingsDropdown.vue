<template>
  <div ref="root" class="relative">
    <button
      :class="[
        'aw-settings-field aw-settings-dropdown',
        isOpen ? 'aw-settings-dropdown-open' : '',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ]"
      type="button"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="aw-settings-dropdown-value">{{ selectedLabel }}</span>
      <icon
        name="chevron-right"
        class="aw-settings-dropdown-chevron h-4 w-4 shrink-0"
        :class="isOpen ? 'rotate-90' : ''"
      ></icon>
    </button>

    <div v-if="isOpen" class="aw-settings-dropdown-menu">
      <button
        v-for="option in options"
        :key="String(option.value)"
        class="aw-settings-dropdown-item"
        type="button"
        @click="select(option.value)"
      >
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold text-foreground-strong">
            {{ option.label }}
          </div>
          <div v-if="option.description" class="truncate text-xs text-foreground-muted">
            {{ option.description }}
          </div>
        </div>
        <icon
          v-if="isSelected(option.value)"
          name="check"
          class="h-4 w-4 shrink-0 text-primary"
        ></icon>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, type PropType } from 'vue';

type DropdownOption = {
  label: string;
  value: string | number;
  description?: string;
};

export default defineComponent({
  name: 'SettingsDropdown',
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    options: {
      type: Array as PropType<DropdownOption[]>,
      default: () => [],
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: 'Select an option',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const isOpen = ref(false);
    const root = ref<HTMLElement | null>(null);

    const selectedOption = computed(() =>
      props.options.find(option => String(option.value) === String(props.modelValue))
    );

    const selectedLabel = computed(() => selectedOption.value?.label || props.placeholder);

    const isSelected = (value: string | number) => String(value) === String(props.modelValue);

    const closeMenu = () => {
      isOpen.value = false;
    };

    const toggle = () => {
      if (props.disabled) return;
      isOpen.value = !isOpen.value;
    };

    const select = (value: string | number) => {
      emit('update:modelValue', value);
      closeMenu();
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!root.value || !target || root.value.contains(target)) return;
      closeMenu();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleDocumentClick);
      document.addEventListener('keydown', handleEscape);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    });

    return {
      isOpen,
      isSelected,
      root,
      select,
      selectedLabel,
      toggle,
    };
  },
});
</script>
