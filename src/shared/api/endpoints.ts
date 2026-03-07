export const API_ENDPOINTS = {
  activity: {
    summarySnapshot: '/0/dashboard/summary-snapshot',
    details: '/0/dashboard/details',
    resolvedScope: '/0/dashboard/resolve-scope',
    timeline: '/0/dashboard/timeline',
  },
  checkins: {
    root: '/0/dashboard/checkins',
  },
  hardware: {
    privacy: '/0/hardware/privacy',
  },
  settings: {
    defaultCategoryClasses: '/0/settings/defaults/classes',
  },
} as const;
