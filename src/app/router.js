import { createRouter, createWebHashHistory } from 'vue-router';

// Activity views for desktop
const ActivityRedirect = () => import('../features/activity/views/ActivityRedirect.vue');
const Activity = () => import('../features/activity/views/Activity.vue');
const ActivityView = () => import('../features/activity/views/ActivityView.vue');

const Buckets = () => import('../features/buckets/views/Buckets.vue');
const Bucket = () => import('../features/buckets/views/Bucket.vue');
const QueryExplorer = () => import('../features/query/views/QueryExplorer.vue');
const Timeline = () => import('../features/timeline/views/Timeline.vue');
const Settings = () => import('../features/settings/views/Settings.vue');
const CategoryBuilder = () => import('../features/categorization/views/CategoryBuilder.vue');
const Stopwatch = () => import('../features/stopwatch/views/Stopwatch.vue');
const Search = () => import('../features/search/views/Search.vue');
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
    { path: '/settings', component: Settings },
    { path: '/settings/category-builder', component: CategoryBuilder },
    { path: '/stopwatch', component: Stopwatch },
    { path: '/search', component: Search },
    { path: '/query', component: QueryExplorer },
    { path: '/dev', component: Dev },
    {
      path: '/:pathMatch(.*)*',
      component: NotFound,
    },
  ],
});

export default router;
