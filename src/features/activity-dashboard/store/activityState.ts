import type { State } from './activityTypes';

export function createInitialActivityState(): State {
  return {
    loaded: false,
    is_initial_loading: false,
    is_refreshing: false,
    refresh_kind: null,
    request_nonce: 0,
    active_request_nonce: 0,
    data_path: null,
    data_notice: null,

    window: {
      available: false,
      top_apps: [],
    },

    browser: {
      available: false,
      top_domains: [],
      top_urls: [],
      top_titles: [],
    },

    editor: {
      available: false,
      duration: 0,
      top_files: [],
      top_languages: [],
      top_projects: [],
    },

    category: {
      available: false,
      by_period: {},
      top: [],
    },

    query_options: null,

    scope: {
      group_name: '',
      resolved_hosts: [],
      available_dates: null,
      earliest_available_date: '',
      latest_available_date: '',
    },

    buckets: {
      loaded: false,
      afk: [],
      window: [],
      editor: [],
      browser: [],
    },
  };
}
