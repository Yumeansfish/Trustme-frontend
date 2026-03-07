<template lang="pug">
div.aw-sidebar
  nav.sidebar-nav
    // Logo
    router-link.sidebar-logo(to="/")
      img(src="/logo.png")
      span.sidebar-label trust-me

    // 主导航
    div.sidebar-main

      // Activity - single host
      router-link.sidebar-item(
        v-if="activityViews && activityViews.length === 1"
        v-for="view in activityViews"
        :key="view.name"
        :to="`/activity/${view.hostname}`"
      )
        icon(name="calendar-day")
        span.sidebar-label Activity

      // Activity - multiple or loading
      div.sidebar-item.sidebar-group(v-if="!activityViews || activityViews.length !== 1")
        div.sidebar-group-header
          icon(name="calendar-day")
          span.sidebar-label Activity
        div.sidebar-group-items
          div.sidebar-subitem.text-muted(v-if="activityViews === null")
            icon(name="ellipsis-h")
            span.sidebar-label Loading...
          div.sidebar-subitem.text-muted(v-else-if="activityViews && activityViews.length <= 0")
            span.sidebar-label No activity available
          router-link.sidebar-subitem(
            v-for="view in activityViews"
            :key="view.name"
            :to="`/activity/${view.hostname}`"
          )
            icon(:name="view.icon")
            span.sidebar-label {{ view.name }}

      router-link.sidebar-item(to="/timeline")
        icon(name="stream")
        span.sidebar-label Timeline

      router-link.sidebar-item(to="/stopwatch")
        icon(name="stopwatch")
        span.sidebar-label Stopwatch

    // 分隔线
    div.sidebar-divider

    // Tools 分组
    div.sidebar-item.sidebar-group
      div.sidebar-group-header
        icon(name="tools")
        span.sidebar-label Tools
      div.sidebar-group-items
        router-link.sidebar-subitem(to="/search")
          icon(name="search")
          span.sidebar-label Search
        router-link.sidebar-subitem(to="/query")
          icon(name="code")
          span.sidebar-label Query
    // 底部固定项
    div.sidebar-bottom
      router-link.sidebar-item(to="/buckets")
        icon(name="database")
        span.sidebar-label Raw Data
      router-link.sidebar-item(to="/settings")
        icon(name="cog")
        span.sidebar-label Settings
</template>

<script lang="ts">
// only import the icons you use to reduce bundle size
import 'vue-awesome/icons/calendar-day';
import 'vue-awesome/icons/calendar-week';
import 'vue-awesome/icons/stream';
import 'vue-awesome/icons/database';
import 'vue-awesome/icons/search';
import 'vue-awesome/icons/code';
// TODO: use circle-nodes instead in the future
//import 'vue-awesome/icons/cicle-nodes';

import 'vue-awesome/icons/ellipsis-h';

import 'vue-awesome/icons/mobile';
import 'vue-awesome/icons/desktop';

import _ from 'lodash';

import { mapState } from 'pinia';
import { useSettingsStore } from '~/stores/settings';
import { useBucketsStore } from '~/stores/buckets';
import { IBucket } from '~/util/interfaces';

export default {
  name: 'Header',
  data() {
    return {
      // Make configurable?
      fixedTopMenu: this.$isAndroid,
    };
  },
  computed: {
    ...mapState(useSettingsStore, ['devmode', 'deviceMappings']),
    ...mapState(useBucketsStore, ['buckets']),
    activityViews() {
      const settingsStore = useSettingsStore();
      if (!settingsStore.loaded || !this.buckets || this.buckets.length === 0) return [];

      const types_by_host: Record<string, any> = {};
      const views = [];

      // Identify which watchers each host has
      _.each(this.buckets, v => {
        types_by_host[v.hostname] = types_by_host[v.hostname] || {};
        types_by_host[v.hostname].afk ||= v.type == 'afkstatus';
        types_by_host[v.hostname].window ||= v.type == 'currentwindow';
        types_by_host[v.hostname].android ||= v.type == 'currentwindow' && v.id.includes('android');
      });

      const processedHosts = new Set<string>();

      const activeMappings =
        this.deviceMappings && Object.keys(this.deviceMappings).length > 0
          ? this.deviceMappings
          : null;

      // 1. Add grouped/mapped aliases first
      if (activeMappings) {
        _.each(activeMappings, (hostsArr: string[], groupName: string) => {
          const validGroupHosts = hostsArr.filter(h => types_by_host[h]);
          if (validGroupHosts.length > 0) {
            validGroupHosts.forEach(h => processedHosts.add(h));
            const isMostlyAndroid = validGroupHosts.some(h => types_by_host[h].android);

            views.push({
              name: groupName,
              hostname: validGroupHosts.join(','), // comma separated payload
              type: isMostlyAndroid ? 'android' : 'default',
              icon: isMostlyAndroid ? 'mobile' : 'desktop',
            });
          }
        });
      }

      // 2. Add any remaining unassigned discrete hosts
      _.each(types_by_host, (types, hostname) => {
        if (processedHosts.has(hostname) || hostname === 'unknown') return;

        if (types['android']) {
          views.push({
            name: `${hostname} (Android)`,
            hostname: hostname,
            type: 'android',
            icon: 'mobile',
          });
        } else {
          views.push({
            name: hostname,
            hostname: hostname,
            type: 'default',
            icon: 'desktop',
          });
        }
      });

      return views;
    },
  },
  mounted: async function () {
    const bucketStore = useBucketsStore();
    await bucketStore.ensureLoaded();
  },
};
</script>

<style lang="scss" scoped>
@import '../style/globals';

$sidebar-collapsed: 56px;
$sidebar-expanded: 200px;
$sidebar-transition: 0.2s ease;
$item-height: 44px;

.aw-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: $sidebar-collapsed;
  background: #fff;
  border-right: 1px solid $lightBorderColor;
  z-index: 200;
  transition: width $sidebar-transition;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &:hover {
    width: $sidebar-expanded;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);

    .sidebar-label {
      opacity: 1;
    }

    .sidebar-group-items {
      max-height: 400px;
    }
  }
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px 0;
}

.sidebar-label {
  opacity: 0;
  transition: opacity 0.15s ease;
  white-space: nowrap;
  margin-left: 12px;
  font-size: 0.88rem;
  color: #444;
}

// Logo 区域
.sidebar-logo {
  display: flex;
  align-items: center;
  height: $item-height;
  padding: 0 16px;
  margin-bottom: 8px;
  text-decoration: none;

  img {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    object-fit: contain;
  }

  .sidebar-label {
    font-weight: 600;
    font-size: 0.95rem;
    color: #222;
    font-family: 'Varela Round', sans-serif;
  }
}

// 主导航区
.sidebar-main {
  flex: 1;
  overflow: hidden;
}

// 通用导航项
.sidebar-item {
  display: flex;
  align-items: center;
  height: $item-height;
  padding: 0 16px;
  color: #555;
  text-decoration: none;
  cursor: pointer;
  border-radius: 0;
  transition: background-color 0.15s ease;
  position: relative;

  &:hover {
    background-color: #f3f4f6;
    color: #222;
    text-decoration: none;
  }

  &.router-link-active {
    color: $activeHighlightColor;
    background-color: rgba($activeHighlightColor, 0.06);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      background: $activeHighlightColor;
      border-radius: 0 2px 2px 0;
    }
  }

  // vue-awesome icon sizing
  .fa-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin: 0;
  }
}

// 分隔线
.sidebar-divider {
  height: 1px;
  background: $lightBorderColor;
  margin: 8px 12px;
}

// 分组
.sidebar-group {
  flex-direction: column;
  height: auto;
  padding: 0;
  align-items: stretch;

  .sidebar-group-header {
    display: flex;
    align-items: center;
    height: $item-height;
    padding: 0 16px;
    color: #888;
    cursor: default;

    .fa-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      margin: 0;
    }

    .sidebar-label {
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #aaa;
    }
  }

  .sidebar-group-items {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.2s ease;
  }
}

// 子菜单项
.sidebar-subitem {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 16px 0 20px;
  color: #666;
  text-decoration: none;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: #f3f4f6;
    color: #222;
    text-decoration: none;
  }

  &.router-link-active {
    color: $activeHighlightColor;
  }

  .fa-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    margin: 0;
  }

  .sidebar-label {
    font-size: 0.85rem;
  }
}

// 底部区域
.sidebar-bottom {
  border-top: 1px solid $lightBorderColor;
  padding-top: 8px;
}
</style>
