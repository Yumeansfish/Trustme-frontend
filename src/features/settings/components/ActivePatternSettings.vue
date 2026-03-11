<template>
  <settings-card
    title="Always Count As Active"
    description="Keep matching apps or window titles active even without keyboard or mouse input."
    icon="code"
  >
    <template #control>
      <ui-input
        v-model="always_active_pattern_editing"
        class="aw-settings-field"
        type="text"
        placeholder="Zoom Meeting|Google Meet|Microsoft Teams"
        :invalid="enabled && !valid"
      />
    </template>

    <div class="aw-settings-subpanel flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <div class="text-sm font-semibold text-foreground-strong">Pattern Status</div>
        <p class="aw-caption !leading-5">
          Example:
          <code class="aw-code-inline">Zoom Meeting|Google Meet|Microsoft Teams</code>
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <span v-if="enabled && valid" class="aw-chip text-success">Enabled</span>
        <span v-else-if="enabled" class="aw-chip text-danger">Invalid Pattern</span>
        <span v-else class="aw-chip text-foreground-muted">Disabled</span>
        <span v-if="enabled && valid && broad_pattern" class="aw-chip text-warning">Too Broad</span>
      </div>
    </div>
  </settings-card>
</template>

<script lang="ts">
import { isRegexBroad, validateRegex } from '~/shared/lib/validate';
import { useSettingsStore } from '~/features/settings/store/settings';
import SettingsCard from '~/features/settings/components/SettingsCard.vue';

export default {
  name: 'ActivePatternSettings',
  components: {
    SettingsCard,
  },
  data() {
    return {
      settingsStore: useSettingsStore(),
      always_active_pattern_editing: '',
    };
  },
  computed: {
    enabled: function () {
      return this.always_active_pattern_editing != '';
    },
    valid: function () {
      return validateRegex(this.always_active_pattern_editing);
    },
    broad_pattern: function () {
      // Check if the pattern matches random strings that we don't expect it to
      // like the alphabet
      const pattern = this.always_active_pattern_editing;
      if (pattern == '') {
        return false;
      }
      return isRegexBroad(pattern);
    },
    always_active_pattern: {
      get() {
        return this.settingsStore.always_active_pattern;
      },
      set(value) {
        this.settingsStore.update({ always_active_pattern: value });
      },
    },
  },
  watch: {
    always_active_pattern_editing: function (value) {
      if (value == this.always_active_pattern) {
        return;
      }

      if (
        (value != '' && this.valid) ||
        (value == '' && this.settingsStore.always_active_pattern.length != 0)
      ) {
        this.always_active_pattern = value;
      }
    },
  },
  mounted() {
    this.always_active_pattern_editing = this.settingsStore.always_active_pattern;
  },
};
</script>
