import { createRouter, createWebHashHistory } from 'vue-router';

// Activity views for desktop
const ActivityRedirect = () => import('../features/activity/views/ActivityRedirect.vue');
const Activity = () => import('../features/activity/views/Activity.vue');
const ActivityView = () => import('../features/activity/views/ActivityView.vue');

const Buckets = () => import('../features/buckets/views/Buckets.vue');
const Bucket = () => import('../features/buckets/views/Bucket.vue');
const Timeline = () => import('../features/timeline/views/Timeline.vue');
const Streamdeck = () => import('../features/streamdeck/views/Streamdeck.vue');
const PrivacySetting = () => import('../features/privacy/views/PrivacySetting.vue');
const Settings = () => import('../features/settings/views/Settings.vue');
const CategoryBuilder = () => import('../features/categorization/views/CategoryBuilder.vue');
const Stopwatch = () => import('../features/stopwatch/views/Stopwatch.vue');
const Dev = () => import('../features/dev/views/Dev.vue');
const NotFound = () => import('./views/NotFound.vue');

function normalizeLandingPage(path) {
  if (!path || path === '/home') {
    return '/activity';
  }

  const legacyActivityMatch = path.match(/^\/activity\/([^/]+)\/view\/?$/);
  if (legacyActivityMatch) {
    return `/activity/${legacyActivityMatch[1]}`;
  }

  return path;
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: _to => {
        return normalizeLandingPage(localStorage.landingpage || '/activity');
      },
    },
    { path: '/home', redirect: '/activity' },
    { path: '/activity', component: ActivityRedirect },
    {
      path: '/activity/:host([^/]+)',
      component: Activity,
      meta: { viewportPage: true },
      props: true,
      children: [
        {
          path: ':periodLength?/:date?/:subview(view)?/:view_id?',
          meta: { subview: 'view' },
          name: 'activity-view',
          component: ActivityView,
          props: true,
        },
        {
          path: '',
          redirect: to => {
            return `${to.path}/day`;
          },
        },
      ],
    },
    { path: '/buckets', component: Buckets },
    { path: '/buckets/:id', component: Bucket, props: true },
    { path: '/timeline', component: Timeline, meta: { fullContainer: true } },
    {
      path: '/streamdeck/:date?',
      component: Streamdeck,
      props: true,
      meta: { fullContainer: true },
    },
    { path: '/privacy', component: PrivacySetting },
    { path: '/settings', component: Settings },
    { path: '/settings/category-builder', component: CategoryBuilder },
    { path: '/away', alias: '/stopwatch', component: Stopwatch },
    { path: '/dev', component: Dev },
    {
      path: '/:pathMatch(.*)*',
      component: NotFound,
    },
  ],
});

export default router;
