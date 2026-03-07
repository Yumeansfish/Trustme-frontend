import { createRouter, createWebHashHistory } from 'vue-router';

const Home = () => import('./views/Home.vue');

// Activity views for desktop
const Activity = () => import('./views/activity/Activity.vue');
const ActivityView = () => import('./views/activity/ActivityView.vue');

const Buckets = () => import('./views/Buckets.vue');
const Bucket = () => import('./views/Bucket.vue');
const QueryExplorer = () => import('./views/QueryExplorer.vue');
const Timeline = () => import('./views/Timeline.vue');
const Settings = () => import('./views/settings/Settings.vue');
const CategoryBuilder = () => import('./views/settings/CategoryBuilder.vue');
const Stopwatch = () => import('./views/Stopwatch.vue');
const Search = () => import('./views/Search.vue');
const Dev = () => import('./views/Dev.vue');
const NotFound = () => import('./views/NotFound.vue');

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: _to => {
        return localStorage.landingpage || '/home';
      },
    },
    { path: '/home', component: Home },
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
