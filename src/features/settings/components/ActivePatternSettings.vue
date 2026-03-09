<template>
<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div class="space-y-2">
    <h5 class="text-sm font-semibold text-foreground-strong">Always count as active pattern</h5><small class="aw-caption">
      Apps or titles matching this regular expression will never be counted as AFK.
      
      Can be used to count time as active, despite no input (like meetings, or games with controllers). An empty string disables it.
      
      Example expression:&nbsp;<code class="aw-code-inline">Zoom Meeting|Google Meet|Microsoft Teams</code></small>
  </div>
  <div class="w-full space-y-2 sm:max-w-md">
    <ui-input class="aw-input-sm" v-model="always_active_pattern_editing" type="text" placeholder="Zoom Meeting|Google Meet|Microsoft Teams" :class="enabled && !valid ? 'aw-input-invalid' : ''" /><small class="block text-right text-sm">
      <div class="text-success" v-if="enabled && valid">Enabled</div>
      <div class="text-danger" v-else-if="enabled">Invalid pattern</div>
      <div class="text-foreground-muted" v-else>Disabled</div>
      <div class="text-danger" v-if="enabled && valid && broad_pattern">Pattern too broad</div></small>
  </div>
</div>
</template>

<script lang="ts">
import { isRegexBroad, validateRegex } from '~/shared/lib/validate';
import { useSettingsStore } from '~/features/settings/store/settings';

export default {
  name: 'ActivePatternSettings',
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
        console.log('Setting always_active_pattern to ' + value);
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
