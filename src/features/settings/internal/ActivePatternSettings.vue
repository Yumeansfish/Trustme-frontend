<template>
  <settings-card
    title="Always Count As Active"
    description="Keep matching apps or window titles active even without keyboard or mouse input."
    icon="code"
  >
    <div class="grid gap-3 md:grid-cols-3">
      <div
        v-for="shortcut in shortcuts"
        :key="shortcut.key"
        class="aw-shortcut-card"
        :class="selectedShortcutKey === shortcut.key ? 'aw-shortcut-card-active' : ''"
        role="button"
        tabindex="0"
        :aria-pressed="selectedShortcutKey === shortcut.key"
        @click="selectShortcut(shortcut.key)"
        @keydown.enter.prevent.self="selectShortcut(shortcut.key)"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <span class="text-foreground-strong text-base font-semibold">{{ shortcut.title }}</span>
          </div>
          <span class="aw-shortcut-card-icon">
            <icon :name="shortcut.icon" class="h-5 w-5"></icon>
          </span>
        </div>
        <div
          v-if="shortcut.isOther && selectedShortcutKey === shortcut.key"
          class="mt-4"
          @click.stop
        >
          <ui-input
            class="aw-input h-11"
            v-model="customPattern"
            :invalid="customPattern.length > 0 && !customPatternValid"
            type="text"
            placeholder=""
            @change="commitCustomPattern"
            @keydown.enter.stop.prevent="commitCustomPattern"
          />
        </div>
      </div>
    </div>
  </settings-card>
</template>

<script lang="ts">
import { validateRegex } from '~/shared/lib/validate';
import { useSettingsStore } from '~/features/settings/store/settings';
import {
  resolveActivePatternSelection,
  type ActiveShortcut,
} from '~/features/settings/lib/activePatternState';
import SettingsCard from '~/features/settings/components/SettingsCard.vue';

export default {
  name: 'ActivePatternSettings',
  components: {
    SettingsCard,
  },
  data() {
    return {
      settingsStore: useSettingsStore(),
      selectedShortcutKey: '',
      customPattern: '',
      shortcuts: [
        {
          key: 'zoom',
          title: 'Zoom',
          icon: 'camera',
          pattern: 'Zoom Meeting',
        },
        {
          key: 'teams',
          title: 'Teams',
          icon: 'desktop',
          pattern: 'Microsoft Teams',
        },
        {
          key: 'other',
          title: 'Other',
          icon: 'question-circle',
          pattern: '',
          isOther: true,
        },
      ] as ActiveShortcut[],
    };
  },
  computed: {
    always_active_pattern(): string {
      return this.settingsStore.always_active_pattern || '';
    },
    customPatternValid(): boolean {
      return this.customPattern === '' || validateRegex(this.customPattern);
    },
  },
  watch: {
    always_active_pattern: {
      immediate: true,
      handler(value: string) {
        this.syncFromPattern(value || '');
      },
    },
  },
  methods: {
    async commitCustomPattern() {
      if (this.selectedShortcutKey !== 'other') return;
      if (!(this.customPattern === '' || this.customPatternValid)) return;
      if (this.customPattern === this.always_active_pattern) return;
      await this.settingsStore.update({ always_active_pattern: this.customPattern });
    },
    syncFromPattern(pattern: string) {
      const selection = resolveActivePatternSelection(pattern, this.shortcuts);
      this.selectedShortcutKey = selection.selectedShortcutKey;
      this.customPattern = selection.customPattern;
    },
    async selectShortcut(key: string) {
      const shortcut = this.shortcuts.find(item => item.key === key);
      if (!shortcut) return;

      this.selectedShortcutKey = key;

      if (shortcut.isOther) {
        this.customPattern = '';
        return;
      }

      if (shortcut.pattern !== this.always_active_pattern) {
        await this.settingsStore.update({ always_active_pattern: shortcut.pattern });
      }

      if (key !== 'other') {
        this.customPattern = '';
      }
    },
  },
};
</script>
