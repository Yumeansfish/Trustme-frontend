import 'core-js/stable';
import 'regenerator-runtime/runtime';

import { createApp, defineAsyncComponent } from 'vue';

import 'typeface-varela-round';

import '../shared/styles/tailwind.css';

import router from './router.js';
import pinia from './pinia.js';

import { createClient, getClient, configureClient } from './lib/awclient';
createClient();

import App from './App.vue';

const app = createApp(App);

app.config.globalProperties.PRODUCTION = PRODUCTION;
app.config.globalProperties.COMMIT_HASH = COMMIT_HASH;
app.config.globalProperties.$isAndroid = process.env.VUE_APP_ON_ANDROID;
app.config.globalProperties.$aw = getClient();

import {
  friendlytime,
  friendlyduration,
  iso8601,
  shortdate,
  shorttime,
  friendlyperiod,
} from '../shared/lib/filters.js';
app.config.globalProperties.friendlytime = friendlytime;
app.config.globalProperties.friendlyduration = friendlyduration;
app.config.globalProperties.iso8601 = iso8601;
app.config.globalProperties.shortdate = shortdate;
app.config.globalProperties.shorttime = shorttime;
app.config.globalProperties.friendlyperiod = friendlyperiod;

import Icon from '../shared/ui/Icon.vue';
import BAlert from '../shared/ui/BAlert.vue';
app.component('icon', Icon);
app.component('aw-alert', BAlert);

app.component(
  'error-boundary',
  defineAsyncComponent(() => import('../shared/feedback/ErrorBoundary.vue'))
);
app.component(
  'input-timeinterval',
  defineAsyncComponent(() => import('../shared/forms/InputTimeInterval.vue'))
);
app.component(
  'aw-header',
  defineAsyncComponent(() => import('../features/sidebar/components/Sidebar.vue'))
);
app.component('aw-footer', defineAsyncComponent(() => import('../shared/layout/Footer.vue')));
app.component('aw-devonly', defineAsyncComponent(() => import('../shared/meta/DevOnly.vue')));
app.component(
  'aw-selectable-vis',
  defineAsyncComponent(() => import('../features/activity/components/SelectableVisualization.vue'))
);
app.component(
  'aw-selectable-eventview',
  defineAsyncComponent(() => import('../features/events/components/SelectableEventView.vue'))
);
app.component(
  'new-release-notification',
  defineAsyncComponent(() => import('../features/settings/components/NewReleaseNotification.vue'))
);
app.component(
  'user-satisfaction-poll',
  defineAsyncComponent(() => import('../features/settings/components/UserSatisfactionPoll.vue'))
);
app.component(
  'aw-query-options',
  defineAsyncComponent(() => import('../features/query/components/QueryOptions.vue'))
);
app.component(
  'aw-select-categories',
  defineAsyncComponent(() => import('../features/categorization/components/SelectCategories.vue'))
);
app.component(
  'aw-select-categories-or-pattern',
  defineAsyncComponent(
    () => import('../features/categorization/components/SelectCategoriesOrPattern.vue')
  )
);

app.component(
  'aw-summary',
  defineAsyncComponent(() => import('../features/insights/components/Summary.vue'))
);
app.component(
  'aw-periodusage',
  defineAsyncComponent(() => import('../features/insights/components/PeriodUsage.vue'))
);
app.component(
  'aw-eventlist',
  defineAsyncComponent(() => import('../features/events/components/EventList.vue'))
);
app.component(
  'aw-sunburst-categories',
  defineAsyncComponent(() => import('../features/categorization/components/visualizations/SunburstCategories.vue'))
);
app.component(
  'aw-top-bucket-data',
  defineAsyncComponent(() => import('../features/activity/components/visualizations/TopBucketData.vue'))
);
app.component(
  'aw-sunburst-clock',
  defineAsyncComponent(() => import('../features/activity/components/visualizations/SunburstClock.vue'))
);
app.component(
  'aw-timeline-inspect',
  defineAsyncComponent(() => import('../features/timeline/components/TimelineInspect.vue'))
);
app.component(
  'aw-timeline',
  defineAsyncComponent(() => import('../features/timeline/components/TimelineSimple.vue'))
);
app.component(
  'vis-timeline',
  defineAsyncComponent(() => import('../features/timeline/components/VisTimeline.vue'))
);
app.component(
  'aw-categorytree',
  defineAsyncComponent(() => import('../features/categorization/components/visualizations/CategoryTree.vue'))
);
app.component(
  'aw-timeline-barchart',
  defineAsyncComponent(() => import('../features/activity/components/visualizations/TimelineBarChart.vue'))
);
app.component(
  'aw-calendar',
  defineAsyncComponent(() => import('../features/timeline/components/Calendar.vue'))
);
app.component(
  'aw-custom-vis',
  defineAsyncComponent(() => import('../features/activity/components/visualizations/CustomVisualization.vue'))
);
app.component(
  'aw-score',
  defineAsyncComponent(() => import('../features/categorization/components/visualizations/Score.vue'))
);
app.component(
  'aw-category-donut',
  defineAsyncComponent(() => import('../features/categorization/components/visualizations/CategoryDonut.vue'))
);

app.use(router);
app.use(pinia);

import asyncErrorCapturedMixin from '../shared/mixins/asyncErrorCaptured.js';
app.mixin(asyncErrorCapturedMixin);

app.mount('#app');

configureClient();
