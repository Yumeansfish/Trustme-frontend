<template>
  <div class="flex h-full min-h-0 flex-col gap-2">
    <div class="flex items-start justify-between gap-3">
      <h5 class="text-foreground-strong flex items-center gap-2 text-base font-semibold">
        <icon class="text-foreground-subtle handle cursor-grab" name="bars" v-if="editable"></icon>
        {{ visualizations[type].title }}
      </h5>
      <div class="flex items-center gap-2" v-if="editable">
        <ui-select
          class="aw-select-sm min-w-44"
          :value="type"
          @change="$emit('onTypeChange', id, $event.target.value)"
        >
          <option v-for="t in types" :key="t" :value="t">
            {{ visualizations[t].title }}{{ visualizations[t].available ? '' : ' (no data)' }}
          </option>
        </ui-select>
        <ui-button
          class="aw-btn aw-btn-sm aw-btn-danger"
          type="button"
          @click="$emit('onRemove', id)"
        >
          <icon name="times"></icon>
        </ui-button>
      </div>
    </div>
    <div v-if="!supports_period">
      <aw-alert class="small px-2 py-1" show variant="warning"
        >This feature doesn't support the current time period.</aw-alert
      >
    </div>
    <div v-if="activityStore.buckets.loaded" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div v-if="pluginInstallState" class="aw-vis-content aw-vis-content-center">
        <div class="aw-plugin-callout">
          <icon class="aw-plugin-callout-icon" :name="pluginInstallState.icon" :size="46"></icon>
          <div class="space-y-1.5 text-center">
            <h6 class="aw-plugin-callout-title">{{ pluginInstallState.title }}</h6>
            <p class="aw-plugin-callout-points">{{ pluginInstallState.points }}</p>
          </div>
          <ui-link
            v-if="pluginInstallDownload"
            class="aw-btn aw-btn-md aw-plugin-callout-cta"
            :href="pluginInstallHref"
            :download="pluginInstallDownload"
            target="_blank"
            rel="noreferrer"
          >
            {{ pluginInstallCtaLabel }}
          </ui-link>
          <ui-link
            v-else
            class="aw-btn aw-btn-md aw-plugin-callout-cta"
            :href="pluginInstallHref"
            target="_blank"
            rel="noreferrer"
          >
            {{ pluginInstallCtaLabel }}
          </ui-link>
        </div>
      </div>
      <template v-else>
        <div v-if="!has_prerequisites" class="shrink-0">
          <aw-alert class="small px-2 py-1" show variant="warning">
            This feature is missing data from a required watcher. You can find a list of all
            watchers in
            <ui-link href="https://activitywatch.readthedocs.io/en/latest/watchers.html"
              >the documentation</ui-link
            >.
          </aw-alert>
        </div>
        <div v-if="type == 'top_apps'" class="aw-vis-content">
          <aw-summary
            class="h-full"
            :fields="activityStore.window.top_apps"
            :namefunc="e => e.data.app"
            :colorfunc="e => e.data.app"
            :selectfunc="onAppSelect"
            :selected-name="selectedAppName"
            with_limit
          ></aw-summary>
        </div>
        <div v-if="type == 'top_titles' && !activityStore.android.available" class="aw-vis-content">
          <aw-summary
            class="h-full"
            :fields="activityStore.window.top_titles"
            :namefunc="e => e.data.title"
            :colorfunc="e => e.data['$category']"
            with_limit
          ></aw-summary>
        </div>
        <div v-if="type == 'top_domains'" class="aw-vis-content">
          <aw-summary
            class="h-full"
            :fields="activityStore.browser.top_domains"
            :namefunc="e => e.data.$domain"
            :colorfunc="e => e.data.$domain"
            with_limit
          ></aw-summary>
        </div>
        <div v-if="type == 'top_urls'" class="aw-vis-content">
          <aw-summary
            class="h-full"
            :fields="activityStore.browser.top_urls"
            :namefunc="e => e.data.url"
            :colorfunc="e => e.data.$domain"
            with_limit
          ></aw-summary>
        </div>
        <div v-if="type == 'top_browser_titles'" class="aw-vis-content">
          <aw-summary
            class="h-full"
            :fields="activityStore.browser.top_titles"
            :namefunc="e => e.data.title"
            :colorfunc="e => e.data.$domain"
            with_limit
          ></aw-summary>
        </div>
        <div v-if="type == 'top_editor_files'" class="aw-vis-content">
          <aw-summary
            class="h-full"
            :fields="activityStore.editor.top_files"
            :namefunc="top_editor_files_namefunc"
            :hoverfunc="top_editor_files_hoverfunc"
            :colorfunc="e => e.data.language"
            with_limit
          ></aw-summary>
        </div>
        <div v-if="type == 'top_editor_languages'" class="aw-vis-content">
          <aw-summary
            class="h-full"
            :fields="activityStore.editor.top_languages"
            :namefunc="e => e.data.language"
            :colorfunc="e => e.data.language"
            with_limit
          ></aw-summary>
        </div>
        <div v-if="type == 'top_editor_projects'" class="aw-vis-content">
          <aw-summary
            class="h-full"
            :fields="activityStore.editor.top_projects"
            :namefunc="top_editor_projects_namefunc"
            :hoverfunc="top_editor_projects_hoverfunc"
            :colorfunc="e => e.data.language"
            with_limit
          ></aw-summary>
        </div>
        <div v-if="type == 'top_categories'" class="aw-vis-content">
          <aw-summary
            class="h-full"
            :fields="activityStore.category.top"
            :namefunc="e => e.data['$category'].join(' > ')"
            :colorfunc="e => e.data['$category']"
            :selectfunc="onCategorySelect"
            :selected-name="selectedCategoryLabel"
            with_limit
          ></aw-summary>
        </div>
        <div v-if="type == 'category_donut'" class="aw-vis-content aw-vis-content-center">
          <aw-category-donut class="h-full"></aw-category-donut>
        </div>
        <div v-if="type == 'category_tree'" class="aw-vis-content">
          <div class="aw-vis-content-scroll">
            <aw-categorytree :events="activityStore.category.top"></aw-categorytree>
          </div>
        </div>
        <div v-if="type == 'category_sunburst'" class="aw-vis-content">
          <aw-sunburst-categories
            class="aw-visualization-min h-full"
            :data="top_categories_hierarchy"
          ></aw-sunburst-categories>
        </div>
        <div v-if="type == 'timeline_barchart'" class="aw-vis-content">
          <aw-timeline-barchart
            class="h-full"
            :datasets="datasets"
            :timeperiod_start="activityStore.query_options?.timeperiod?.start"
            :timeperiod_length="activityStore.query_options?.timeperiod?.length"
          ></aw-timeline-barchart>
        </div>
        <div v-if="type == 'sunburst_clock'" class="aw-vis-content">
          <aw-sunburst-clock
            class="h-full"
            :date="date"
            :afkBucketId="activityStore.buckets.afk[0]"
            :windowBucketId="activityStore.buckets.window[0]"
          ></aw-sunburst-clock>
        </div>
        <div v-if="type == 'custom_vis'" class="aw-vis-content">
          <aw-custom-vis
            class="h-full"
            :visname="props.visname"
            :title="props.title"
          ></aw-custom-vis>
        </div>
        <div v-if="type == 'vis_timeline' && isSingleDay" class="aw-vis-content">
          <vis-timeline
            class="h-full"
            :buckets="timeline_buckets"
            :showRowLabels="true"
            :queriedInterval="timeline_daterange"
          ></vis-timeline>
        </div>
        <div v-if="type == 'score'" class="aw-vis-content">
          <aw-score class="h-full"></aw-score>
        </div>
        <div v-if="type == 'top_stopwatches'" class="aw-vis-content">
          <aw-summary
            class="h-full"
            :fields="activityStore.stopwatch.top_stopwatches"
            :namefunc="e => e.data.label"
            :colorfunc="e => e.data.label"
            with_limit
          ></aw-summary>
        </div>
        <div v-if="type == 'top_bucket_data'" class="aw-vis-content">
          <aw-top-bucket-data
            class="h-full"
            :initialBucketId="props ? props.bucketId : ''"
            :initialField="props ? props.field : ''"
            :initialCustomField="props ? props.customField : ''"
            @update-props="onWatcherPropsChange"
          ></aw-top-bucket-data>
        </div>
      </template>
    </div>
    <div v-else class="aw-empty-state">
      <div class="aw-loading">Loading...</div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';

import { buildBarchartDataset } from '~/features/activity/lib/datasets';
import { useActivityHighlightStore } from '~/features/activity/store/highlight';

// TODO: Move this somewhere else
import { build_category_hierarchy } from '~/features/categorization/lib/classes';

import { useActivityStore } from '~/features/activity/store/activity';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import { useViewsStore } from '~/features/activity/store/views';

import moment from 'moment';

function pick_subname_as_name(c) {
  c.name = c.subname;
  c.children = c.children.map(pick_subname_as_name);
  return c;
}

export default {
  name: 'aw-selectable-vis',
  props: {
    id: Number,
    type: String,
    props: Object,
    viewId: { type: String, default: '' },
    editable: { type: Boolean, default: true },
  },
  data: function () {
    return {
      activityStore: useActivityStore(),
      highlightStore: useActivityHighlightStore(),
      categoryStore: useCategoryStore(),

      types: [
        'top_apps',
        'top_titles',
        'top_domains',
        'top_urls',
        'top_browser_titles',
        'top_categories',
        'category_donut',
        'category_tree',
        'category_sunburst',
        'top_editor_files',
        'top_editor_languages',
        'top_editor_projects',
        'timeline_barchart',
        'sunburst_clock',
        'custom_vis',
        'vis_timeline',
        'score',
        'top_stopwatches',
        'top_bucket_data',
      ],
      // TODO: Move this function somewhere else
      top_editor_files_namefunc: e => {
        let f = e.data.file || '';
        f = f.split('/');
        f = f[f.length - 1];
        return f;
      },
      top_editor_files_hoverfunc: e => {
        return 'file: ' + e.data.file + '\n' + 'project: ' + e.data.project;
      },
      // TODO: Move this function somewhere else
      top_editor_projects_namefunc: e => {
        let f = e.data.project || '';
        f = f.split('/');
        f = f[f.length - 1];
        return f;
      },
      top_editor_projects_hoverfunc: e => e.data.project,
      timeline_buckets: null,
    };
  },
  computed: {
    visualizations: function () {
      return {
        browser_plugin_prompt: {
          title: 'Browser Plugin',
          available: true,
        },
        editor_plugin_prompt: {
          title: 'Editor Plugin',
          available: true,
        },
        top_apps: {
          title: 'Top Applications',
          available: this.activityStore.window.available || this.activityStore.android.available,
        },
        top_titles: {
          title: 'Top Window Titles',
          available: this.activityStore.window.available,
        },
        top_domains: {
          title: 'Top Browser Domains',
          available: this.activityStore.browser.available,
        },
        top_urls: {
          title: 'Top Browser URLs',
          available: this.activityStore.browser.available,
        },
        top_browser_titles: {
          title: 'Top Browser Titles',
          available: this.activityStore.browser.available,
        },
        top_editor_files: {
          title: 'Top Editor Files',
          available: this.activityStore.editor.available,
        },
        top_editor_languages: {
          title: 'Top Editor Languages',
          available: this.activityStore.editor.available,
        },
        top_editor_projects: {
          title: 'Top Editor Projects',
          available: this.activityStore.editor.available,
        },
        top_categories: {
          title: 'Top Categories',
          available: this.activityStore.category.available,
        },
        category_donut: {
          title: 'Pie Chart',
          available: this.activityStore.category.available,
        },
        category_tree: {
          title: 'Category Tree',
          available: this.activityStore.category.available,
        },
        category_sunburst: {
          title: 'Category Sunburst',
          available: this.activityStore.category.available,
        },
        timeline_barchart: {
          title: 'Timeline',
          available: true,
        },
        sunburst_clock: {
          title: 'Sunburst clock',
          available: this.activityStore.window.available && this.activityStore.active.available,
        },
        vis_timeline: {
          title: 'Daily Timeline (Chronological)',
          available: true,
        },
        custom_vis: {
          title: 'Custom Visualization',
          available: true, // TODO: Implement
        },
        score: {
          title: 'Score',
          available: this.activityStore.category.available,
        },
        top_stopwatches: {
          title: 'Top Away Sessions',
          available: this.activityStore.stopwatch.available,
        },
        top_bucket_data: {
          title: 'Top Bucket Data',
          available: true,
        },
      };
    },
    isFirefoxBrowser() {
      if (typeof navigator === 'undefined') return false;
      return /firefox/i.test(navigator.userAgent);
    },
    pluginInstallHref() {
      if (!this.pluginInstallState) return '#';

      if (this.pluginInstallState.kind === 'browser') {
        if (this.isFirefoxBrowser) {
          return 'https://addons.mozilla.org/firefox/downloads/latest/aw-watcher-web/latest.xpi';
        }

        return 'https://chromewebstore.google.com/detail/activitywatch-web-watcher/nglaklhklhcoonedhgnpgddginnjdadi';
      }

      return 'https://marketplace.visualstudio.com/items?itemName=activitywatch.aw-watcher-vscode';
    },
    pluginInstallDownload() {
      if (!this.pluginInstallState) return '';
      if (this.pluginInstallState.kind === 'browser' && this.isFirefoxBrowser) {
        return 'aw-watcher-web-latest.xpi';
      }
      return '';
    },
    pluginInstallCtaLabel() {
      if (!this.pluginInstallState) return 'Install Plugin';
      if (this.pluginInstallState.kind === 'browser') {
        return this.isFirefoxBrowser ? 'Download Firefox Plugin' : 'Open Chrome Store';
      }
      return 'Open VS Code Marketplace';
    },
    has_prerequisites() {
      return this.visualizations[this.type].available;
    },
    pluginInstallState() {
      if (
        this.type === 'browser_plugin_prompt' ||
        (['top_domains', 'top_urls', 'top_browser_titles'].includes(this.type) &&
          !this.activityStore.browser.available)
      ) {
        return {
          kind: 'browser',
          icon: 'globe',
          title: 'Unlock Browser Activity',
          points: 'Domains • URLs • Tab Titles',
        };
      }

      if (
        this.type === 'editor_plugin_prompt' ||
        (['top_editor_files', 'top_editor_languages', 'top_editor_projects'].includes(this.type) &&
          !this.activityStore.editor.available)
      ) {
        return {
          kind: 'editor',
          icon: 'terminal',
          title: 'Unlock Editor Activity',
          points: 'Files • Projects • Languages',
        };
      }

      return null;
    },
    selectedAppName() {
      return this.highlightStore.app;
    },
    selectedCategoryLabel() {
      return this.highlightStore.categoryLabel;
    },
    supports_period: function () {
      if (this.type == 'sunburst_clock' || this.type == 'vis_timeline') {
        return this.isSingleDay;
      }
      return true;
    },
    top_categories_hierarchy: function () {
      const top_categories = this.activityStore.category.top;
      if (top_categories) {
        const categories = top_categories.map(c => {
          return { name: c.data.$category, size: c.duration };
        });

        return {
          name: 'All',
          children: build_category_hierarchy(categories).map(c => pick_subname_as_name(c)),
        };
      } else {
        return null;
      }
    },
    datasets: function () {
      // Return empty array if not loaded
      if (!this.activityStore.category.by_period) return [];

      const datasets = buildBarchartDataset(
        this.activityStore.category.by_period,
        this.categoryStore.classes
      );

      // Return dataset if data found, else return null (indicating no data)
      if (datasets.length > 0) return datasets;
      else return null;
    },
    date: function () {
      if (!this.activityStore.query_options?.timeperiod) return null;
      let date = this.activityStore.query_options.date;
      if (!date) {
        date = this.activityStore.query_options.timeperiod.start;
      }
      return date;
    },
    timeline_daterange: function () {
      if (!this.activityStore.query_options?.timeperiod) return null;

      let date = this.activityStore.query_options.date;
      if (!date) {
        date = this.activityStore.query_options.timeperiod.start;
      }

      return [moment(date), moment(date).add(1, 'day')];
    },
    isSingleDay: function () {
      return _.isEqual(this.activityStore.query_options?.timeperiod?.length, [1, 'day']);
    },
  },
  watch: {
    timeline_daterange: async function () {
      await this.getTimelineBuckets();
    },
    type: async function (newType) {
      if (newType == 'vis_timeline') await this.getTimelineBuckets();
    },
  },
  mounted: async function () {
    if (this.type == 'vis_timeline') {
      await this.getTimelineBuckets();
    }
  },
  methods: {
    onAppSelect(event) {
      const app = event?.data?.app || null;
      const category = event?.data?.['$category'] || null;
      if (!app) return;

      if (this.selectedAppName === app) {
        this.highlightStore.clear();
        return;
      }

      this.highlightStore.setApp({ app, category });
    },
    onCategorySelect(event) {
      const category = event?.data?.['$category'] || null;
      if (!category) return;

      if (this.selectedCategoryLabel === category.join(' > ')) {
        this.highlightStore.clear();
        return;
      }

      this.highlightStore.setCategory(category);
    },
    onWatcherPropsChange(newProps) {
      if (!this.viewId) return;
      const mergedProps = { ...(this.props || {}), ...newProps };
      useViewsStore().editView({
        view_id: this.viewId,
        el_id: this.id,
        type: this.type,
        props: mergedProps,
      });
    },
    getTimelineBuckets: async function () {
      if (this.type != 'vis_timeline') return;
      if (!this.timeline_daterange) return;

      await useBucketsStore().ensureLoaded();
      this.timeline_buckets = Object.freeze(
        await useBucketsStore().getBucketsWithEvents({
          start: this.timeline_daterange[0].format(),
          end: this.timeline_daterange[1].format(),
        })
      );
    },
  },
};
</script>
