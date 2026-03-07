import 'core-js/stable';
import 'regenerator-runtime/runtime';

import { createApp, defineAsyncComponent } from 'vue';

// Load the Varela Round font
import 'typeface-varela-round';

// Load Tailwind and main style
import './style/tailwind.css';
import './style/bootstrap-compat.css';

// Sets up the routing and the base app (using vue-router)
import router from './route.js';

// Sets up the pinia store
import pinia from './stores';

// Create an instance of AWClient
import { createClient, getClient, configureClient } from './util/awclient';
createClient();

// Import root App component
import App from './App.vue';

// Create the Vue 3 app
const app = createApp(App);

// Globals
app.config.globalProperties.PRODUCTION = PRODUCTION;
app.config.globalProperties.COMMIT_HASH = COMMIT_HASH;
app.config.globalProperties.$isAndroid = process.env.VUE_APP_ON_ANDROID;
app.config.globalProperties.$aw = getClient();

// Register legacy filter functions as global properties (Vue 3 removed filters)
import { friendlytime, friendlyduration, iso8601, shortdate, shorttime, friendlyperiod } from './util/filters.js';
app.config.globalProperties.friendlytime = friendlytime;
app.config.globalProperties.friendlyduration = friendlyduration;
app.config.globalProperties.iso8601 = iso8601;
app.config.globalProperties.shortdate = shortdate;
app.config.globalProperties.shorttime = shorttime;
app.config.globalProperties.friendlyperiod = friendlyperiod;

// Shim components (replacing vue-awesome and bootstrap-vue)
import Icon from './components/Icon.vue';
import BAlert from './components/BAlert.vue';
import { registerBootstrapShims } from './shims/bootstrap-shim.js';
app.component('icon', Icon);
app.component('b-alert', BAlert);
registerBootstrapShims(app);

// General components
app.component('error-boundary', defineAsyncComponent(() => import('./components/ErrorBoundary.vue')));
app.component('input-timeinterval', defineAsyncComponent(() => import('./components/InputTimeInterval.vue')));
app.component('aw-header', defineAsyncComponent(() => import('./components/Header.vue')));
app.component('aw-footer', defineAsyncComponent(() => import('./components/Footer.vue')));
app.component('aw-devonly', defineAsyncComponent(() => import('./components/DevOnly.vue')));
app.component('aw-selectable-vis', defineAsyncComponent(() => import('./components/SelectableVisualization.vue')));
app.component('aw-selectable-eventview', defineAsyncComponent(() => import('./components/SelectableEventView.vue')));
app.component('new-release-notification', defineAsyncComponent(() => import('./components/NewReleaseNotification.vue')));
app.component('user-satisfaction-poll', defineAsyncComponent(() => import('./components/UserSatisfactionPoll.vue')));
app.component('aw-query-options', defineAsyncComponent(() => import('./components/QueryOptions.vue')));
app.component('aw-select-categories', defineAsyncComponent(() => import('./components/SelectCategories.vue')));
app.component('aw-select-categories-or-pattern', defineAsyncComponent(() =>
  import('./components/SelectCategoriesOrPattern.vue')
));

// Visualization components
app.component('aw-summary', defineAsyncComponent(() => import('./visualizations/Summary.vue')));
app.component('aw-periodusage', defineAsyncComponent(() => import('./visualizations/PeriodUsage.vue')));
app.component('aw-eventlist', defineAsyncComponent(() => import('./visualizations/EventList.vue')));
app.component('aw-sunburst-categories', defineAsyncComponent(() => import('./visualizations/SunburstCategories.vue')));
app.component('aw-top-bucket-data', defineAsyncComponent(() => import('./visualizations/TopBucketData.vue')));
app.component('aw-sunburst-clock', defineAsyncComponent(() => import('./visualizations/SunburstClock.vue')));
app.component('aw-timeline-inspect', defineAsyncComponent(() => import('./visualizations/TimelineInspect.vue')));
app.component('aw-timeline', defineAsyncComponent(() => import('./visualizations/TimelineSimple.vue')));
app.component('vis-timeline', defineAsyncComponent(() => import('./visualizations/VisTimeline.vue')));
app.component('aw-categorytree', defineAsyncComponent(() => import('./visualizations/CategoryTree.vue')));
app.component('aw-timeline-barchart', defineAsyncComponent(() => import('./visualizations/TimelineBarChart.vue')));
app.component('aw-calendar', defineAsyncComponent(() => import('./visualizations/Calendar.vue')));
app.component('aw-custom-vis', defineAsyncComponent(() => import('./visualizations/CustomVisualization.vue')));
app.component('aw-score', defineAsyncComponent(() => import('./visualizations/Score.vue')));
app.component('aw-category-donut', defineAsyncComponent(() => import('./visualizations/CategoryDonut.vue')));

// Plugins
app.use(router);
app.use(pinia);

// A mixin to make async method errors propagate
import asyncErrorCapturedMixin from './mixins/asyncErrorCaptured.js';
app.mixin(asyncErrorCapturedMixin);

// Mount the app
app.mount('#app');

// Must be run after vue init since it relies on the settings store
configureClient();
