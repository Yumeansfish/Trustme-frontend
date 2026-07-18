import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import { isDevelopmentServer } from './config/runtime';

// Activity views for desktop
const ActivityRedirect = () => import('../features/activity/views/ActivityRedirect.vue');
const Activity = () => import('../features/activity/views/Activity.vue');
const ActivityView = () => import('../features/activity/views/ActivityView.vue');

const Buckets = () => import('../features/buckets/views/Buckets.vue');
const BucketGroup = () => import('../features/buckets/views/BucketGroup.vue');
const Bucket = () => import('../features/buckets/views/Bucket.vue');
const Timeline = () => import('../features/timeline/views/Timeline.vue');
const Review = () => import('../features/review/views/Review.vue');
const Home = () => import('../features/home/views/Home.vue');
const Settings = () => import('../features/settings/views/Settings.vue');
const AwaySession = () => import('../features/away-session/views/AwaySession.vue');
const NotFound = () => import('./views/NotFound.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home',
  },
  { path: '/home', component: Home, meta: { fullContainer: true } },
  { path: '/activity', component: ActivityRedirect },
  {
    path: '/activity/:host([^/]+)',
    component: Activity,
    meta: { viewportPage: true, preloadActivitySummary: true },
    props: true,
    children: [
      {
        path: 'custom/:date?/:end?/:subview(view)?/:view_id?',
        meta: { subview: 'view' },
        name: 'activity-custom-view',
        component: ActivityView,
        props: true,
      },
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
  {
    path: '/buckets/group/:groupKey/:date?',
    component: BucketGroup,
    props: true,
    meta: { viewportPage: true },
  },
  { path: '/buckets/:id', component: Bucket, props: true },
  { path: '/timeline', component: Timeline, meta: { fullContainer: true } },
  {
    path: '/review/:date?',
    component: Review,
    props: true,
    meta: { fullContainer: true },
  },
  { path: '/settings', component: Settings },
  { path: '/away', component: AwaySession },
  ...(isDevelopmentServer
    ? [{ path: '/dev', component: () => import('./devtools/Dev.vue') }]
    : []),
  {
    path: '/:pathMatch(.*)*',
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
