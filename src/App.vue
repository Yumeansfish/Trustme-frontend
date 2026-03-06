<template lang="pug">
div#wrapper(v-if="loaded")
  aw-header

  div.main-content(:class="{'container': !fullContainer, 'container-fluid': fullContainer}").px-0.px-md-2
    div.aw-container.my-sm-3.p-3
      error-boundary
        //- user-satisfaction-poll
        new-release-notification(v-if="isNewReleaseCheckEnabled")
        router-view

</template>

<style lang="scss">
$sidebar-collapsed: 56px;
$sidebar-expanded: 200px;
$content-padding: 24px;
$sidebar-transition: 0.2s ease;

body {
  overflow-x: hidden;
}

.main-content {
  margin-left: $sidebar-collapsed;
  padding-left: $content-padding;
  padding-right: $content-padding;
  min-width: 0;
  transition: margin-left $sidebar-transition;

  // 覆盖 Bootstrap .container 的最大宽度限制
  &.container {
    max-width: none;
    width: auto;
  }
}

// 当 sidebar hover 时，主内容区同步右移
.aw-sidebar:hover ~ .main-content {
  margin-left: $sidebar-expanded;
}
</style>

<script lang="ts">
import { useSettingsStore } from '~/stores/settings';
import { useServerStore } from '~/stores/server';
import { detectPreferredTheme } from '~/util/theme';
// if vite is used, you can import css file as module
//import darkCssUrl from '../static/dark.css?url';
//import darkCssContent from '../static/dark.css?inline';

export default {
  data: function () {
    return {
      activityViews: [],
      isNewReleaseCheckEnabled: !process.env.VUE_APP_ON_ANDROID,
      loaded: false,
    };
  },

  computed: {
    fullContainer() {
      return this.$route.meta.fullContainer;
    },
  },

  async beforeCreate() {
    // Get Theme From LocalStorage
    const settingsStore = useSettingsStore();
    await settingsStore.ensureLoaded();
    const theme = settingsStore.theme;
    const detectedTheme = theme === 'auto' ? detectPreferredTheme() : theme;

    // Apply the dark theme if detected
    if (detectedTheme === 'dark') {
      const method: 'link' | 'style' = 'link';

      if (method === 'link') {
        // Method 1: Create <link> Element
        // Create Dark Theme Element
        const themeLink = document.createElement('link');
        themeLink.href = '/dark.css'; // darkCssUrl
        themeLink.rel = 'stylesheet';
        // Append Dark Theme Element
        document.querySelector('head').appendChild(themeLink);
      } else {
        // Not supported for Webpack due to not supporting ?inline import in a cross-compatible way (afaik)
        // Method 2: Create <style> Element
        //const style = document.createElement('style');
        //style.innerHTML = darkCssContent;
        //theme === 'dark' ? document.querySelector('head').appendChild(style) : '';
      }
    }
    this.loaded = true;
  },

  mounted: async function () {
    const serverStore = useServerStore();
    await serverStore.getInfo();
  },
};
</script>
