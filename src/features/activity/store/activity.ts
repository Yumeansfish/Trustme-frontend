import { defineStore } from 'pinia';
import moment from 'moment';
import * as _ from 'lodash';
import { map, filter, values, groupBy, sortBy, flow, reverse } from 'lodash/fp';
import { IEvent } from '~/shared/lib/interfaces';

import { window_events } from '~/features/activity/lib/fakedata';
import queries from '~/app/lib/queries';
import { get_day_start_with_offset } from '~/app/lib/time';
import {
  TimePeriod,
  dateToTimeperiod,
  timeperiodToStr,
  timeperiodsHoursOfPeriod,
  timeperiodsDaysOfPeriod,
  timeperiodsMonthsOfPeriod,
  timeperiodsAroundTimeperiod,
} from '~/app/lib/timeperiod';

import { useSettingsStore } from '~/features/settings/store/settings';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import { useCategoryStore } from '~/features/categorization/store/categories';

import { getClient } from '~/app/lib/awclient';

function timeperiodsStrsHoursOfPeriod(timeperiod: TimePeriod): string[] {
  return timeperiodsHoursOfPeriod(timeperiod).map(timeperiodToStr);
}

function timeperiodsStrsDaysOfPeriod(timeperiod: TimePeriod): string[] {
  return timeperiodsDaysOfPeriod(timeperiod).map(timeperiodToStr);
}

function timeperiodsStrsMonthsOfPeriod(timeperiod: TimePeriod): string[] {
  return timeperiodsMonthsOfPeriod(timeperiod).map(timeperiodToStr);
}

function timeperiodStrsAroundTimeperiod(timeperiod: TimePeriod): string[] {
  return timeperiodsAroundTimeperiod(timeperiod).map(timeperiodToStr);
}

function colorCategories(events: IEvent[]): IEvent[] {
  // Set $color for categories
  const categoryStore = useCategoryStore();
  return events.map((e: IEvent) => {
    e.data['$color'] = categoryStore.get_category_color(e.data['$category']);
    return e;
  });
}

function scoreCategories(events: IEvent[]): IEvent[] {
  // Set $score for categories
  const categoryStore = useCategoryStore();
  return events.map((e: IEvent) => {
    e.data['$score'] = categoryStore.get_category_score(e.data['$category']);
    return e;
  });
}

export interface QueryOptions {
  host: string;
  date?: string;
  timeperiod?: TimePeriod;
  filter_afk?: boolean;
  include_audible?: boolean;
  include_stopwatch?: boolean;
  filter_categories?: string[][];
  dont_query_inactive?: boolean;
  force?: boolean;
  always_active_pattern?: string;
}

type MaybeLoadedList<T> = T[] | null;
type CategoryPeriodData = Record<string, { cat_events: IEvent[] }>;

interface WindowQueryResult {
  app_events?: IEvent[] | null;
  title_events?: IEvent[] | null;
  cat_events?: IEvent[] | null;
  active_events?: IEvent[] | null;
  duration?: number | null;
}

interface BrowserQueryResult {
  domains?: IEvent[] | null;
  urls?: IEvent[] | null;
  titles?: IEvent[] | null;
  duration?: number | null;
}

interface StopwatchQueryResult {
  stopwatch_events?: IEvent[] | null;
}

interface EditorQueryResult {
  duration?: number | null;
  files?: IEvent[] | null;
  languages?: IEvent[] | null;
  projects?: IEvent[] | null;
}

function ensureEventList(events: unknown): IEvent[] {
  return Array.isArray(events) ? [...events] : [];
}

function ensureDuration(duration: unknown): number {
  return typeof duration === 'number' && Number.isFinite(duration) ? duration : 0;
}

function ensureActiveHistory(
  active_history: unknown
): Record<string, IEvent[]> {
  if (!active_history || typeof active_history !== 'object' || Array.isArray(active_history)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(active_history as Record<string, unknown>).map(([key, value]) => [
      key,
      ensureEventList(value),
    ])
  );
}

function ensureByPeriod(by_period: unknown): CategoryPeriodData {
  if (!by_period || typeof by_period !== 'object' || Array.isArray(by_period)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(by_period as Record<string, unknown>).map(([key, value]) => {
      const cat_events =
        value && typeof value === 'object' && !Array.isArray(value)
          ? ensureEventList((value as { cat_events?: unknown }).cat_events)
          : [];

      return [key, { cat_events }];
    })
  );
}

interface State {
  loaded: boolean;

  window: {
    available: boolean;
    top_apps: MaybeLoadedList<IEvent>;
    top_titles: MaybeLoadedList<IEvent>;
  };

  browser: {
    available: boolean;
    duration: number;
    top_urls: MaybeLoadedList<IEvent>;
    top_domains: MaybeLoadedList<IEvent>;
    top_titles: MaybeLoadedList<IEvent>;
  };

  editor: {
    available: boolean;
    duration: number;
    top_files: MaybeLoadedList<IEvent>;
    top_projects: MaybeLoadedList<IEvent>;
    top_languages: MaybeLoadedList<IEvent>;
  };

  category: {
    available: boolean;
    by_period: CategoryPeriodData | null;
    top: MaybeLoadedList<IEvent>;
  };

  active: {
    available: boolean;
    duration: number | null;
    // non-afk events (no detail data) for the current period
    events: MaybeLoadedList<IEvent>;
    // Aggregated events for current and past periods
    history: Record<string, IEvent[]>;
  };

  android: {
    available: boolean;
  };

  stopwatch: {
    available: boolean;
    top_stopwatches: IEvent[];
  };

  query_options?: QueryOptions;

  // Can't this be handled in bucketStore?
  buckets: {
    loaded: boolean;
    afk: string[];
    window: string[];
    editor: string[];
    browser: string[];
    android: string[];
    stopwatch: string[];
  };
}

export const useActivityStore = defineStore('activity', {
  // initial state
  state: (): State => ({
    // set to true once loading has started
    loaded: false,

    window: {
      available: false,
      top_apps: [],
      top_titles: [],
    },

    browser: {
      available: false,
      duration: 0,
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

    active: {
      available: false,
      duration: 0,
      // non-afk events (no detail data) for the current period
      events: [],
      // Aggregated events for current and past periods
      history: {},
    },

    android: {
      available: false,
    },

    stopwatch: {
      available: false,
      top_stopwatches: [],
    },

    query_options: null,

    buckets: {
      loaded: false,
      afk: [],
      window: [],
      editor: [],
      browser: [],
      android: [],
      stopwatch: [],
    },
  }),

  getters: {
    getActiveHistoryAroundTimeperiod(this: State) {
      return (timeperiod: TimePeriod): IEvent[][] => {
        const periods = timeperiodStrsAroundTimeperiod(timeperiod);
        const _history = periods.map(tp => {
          if (_.has(this.active.history, tp)) {
            return this.active.history[tp];
          } else {
            // A zero-duration placeholder until new data has been fetched
            return [{ timestamp: moment(tp.split('/')[0]).format(), duration: 0, data: {} }];
          }
        });
        return _history;
      };
    },
    uncategorizedDuration(this: State): [number, number] | null {
      // Returns the uncategorized duration and the total duration
      if (!this.category.top) {
        return null;
      }
      const uncategorized = this.category.top.filter(e => {
        return _.isEqual(e.data['$category'], ['Uncategorized']);
      });
      const uncategorized_duration = uncategorized.length > 0 ? uncategorized[0].duration : 0;
      const total_duration = this.category.top.reduce((acc, e) => {
        return acc + e.duration;
      }, 0);
      return [uncategorized_duration, total_duration];
    },
  },

  actions: {
    async ensure_loaded(query_options: QueryOptions) {
      console.log('--- ACTIVITY STORE: ensure_loaded called with options ---', query_options);
      const settingsStore = useSettingsStore();
      await settingsStore.ensureLoaded();

      const bucketsStore = useBucketsStore();

      console.info('Query options: ', query_options);
      if (this.loaded) {
        getClient().abort();
      }
      if (!this.loaded || this.query_options !== query_options || query_options.force) {
        console.log('ACTIVITY STORE: Actually loading data now...');
        this.start_loading(query_options);
        if (!query_options.timeperiod) {
          query_options.timeperiod = dateToTimeperiod(query_options.date, settingsStore.startOfDay);
        }

        await bucketsStore.ensureLoaded();
        await this.get_buckets(query_options);

        // TODO: These queries can actually run in parallel, but since server won't process them in parallel anyway we won't.
        this.set_available();

        const hostsList = query_options.host.split(',').map(h => h.trim());

        if (this.window.available) {
          console.info(
            settingsStore.useMultidevice || hostsList.length > 1
              ? 'Querying multiple devices'
              : 'Querying a single device'
          );
          if (settingsStore.useMultidevice || hostsList.length > 1) {
            const hostnames = bucketsStore.hosts.filter(
              // require that the host has window buckets,
              // and that the host is not a fakedata host,
              // unless we're explicitly querying fakedata
              host =>
                host &&
                bucketsStore.bucketsWindow(host).length > 0 &&
                hostsList.includes(host) &&
                (!host.startsWith('fakedata') || query_options.host.startsWith('fakedata'))
            );
            console.info('Including hosts in multiquery: ', hostnames);
            await this.query_multidevice_full(query_options, hostnames);
          } else {
            await this.query_desktop_full(query_options);
          }
        } else if (this.android.available) {
          await this.query_android(query_options);
        } else {
          console.log(
            'Cannot query windows as we are missing either an afk/window bucket pair or an android bucket'
          );
          this.query_window_completed();
          this.query_category_time_by_period_completed();
        }

        if (this.active.available) {
          await this.query_active_history(query_options);
        } else if (this.android.available) {
          await this.query_active_history_android(query_options);
        } else {
          console.log('Cannot call query_active_history as we do not have an afk bucket');
          await this.query_active_history_completed();
        }

        if (this.editor.available) {
          await this.query_editor(query_options);
        } else {
          console.log('Cannot call query_editor as we do not have any editor buckets');
          await this.query_editor_completed();
        }

        // Perform this last, as it takes the longest
        if (this.window.available || this.android.available) {
          await this.query_category_time_by_period(query_options);
        }
      } else {
        console.warn(
          'ensure_loaded called twice with same query_options but without query_options.force = true, skipping...'
        );
      }
    },

    async query_android({ timeperiod, filter_categories }: QueryOptions) {
      const periods = [timeperiodToStr(timeperiod)];
      const categoryStore = useCategoryStore();
      const q = queries.appQuery(
        this.buckets.android[0],
        categoryStore.queryRules,
        filter_categories
      );
      const data = await getClient().query(periods, q).catch(this.errorHandler);
      this.query_window_completed(data?.[0]);
    },

    async reset() {
      getClient().abort();
      this.query_window_completed({});
      this.query_browser_completed({});
      this.query_editor_completed({});
      this.query_category_time_by_period_completed({});
    },

    async query_multidevice_full(
      { timeperiod, filter_categories, filter_afk, always_active_pattern }: QueryOptions,
      hosts: string[]
    ) {
      const periods = [timeperiodToStr(timeperiod)];
      const categories = useCategoryStore().queryRules;

      const q = queries.multideviceQuery({
        hosts,
        filter_afk,
        categories,
        filter_categories,
        host_params: {},
        always_active_pattern,
      });
      const data = await getClient().query(periods, q, { name: 'multidevice', verbose: true });
      this.query_window_completed(data?.[0]?.window);
    },

    async query_desktop_full({
      timeperiod,
      filter_categories,
      filter_afk,
      include_audible,
      include_stopwatch,
      always_active_pattern,
    }: QueryOptions) {
      const periods = [timeperiodToStr(timeperiod)];
      const categories = useCategoryStore().queryRules;

      const q = queries.fullDesktopQuery({
        bid_window: this.buckets.window[0],
        bid_afk: this.buckets.afk[0],
        bid_browsers: this.buckets.browser,
        bid_stopwatch:
          include_stopwatch && this.buckets.stopwatch.length > 0
            ? this.buckets.stopwatch[0]
            : undefined,
        filter_afk,
        categories,
        filter_categories,
        include_audible,
        always_active_pattern,
      });
      const data = await getClient().query(periods, q, {
        name: 'fullDesktopQuery',
        verbose: true,
      });
      this.query_window_completed(data?.[0]?.window);
      this.query_browser_completed(data?.[0]?.browser);
      if (include_stopwatch) {
        this.query_stopwatch_completed(data?.[0]?.stopwatch);
      }
    },

    async query_editor({ timeperiod }) {
      const periods = [timeperiodToStr(timeperiod)];
      const q = queries.editorActivityQuery(this.buckets.editor);
      const data = await getClient().query(periods, q, {
        name: 'editorActivityQuery',
        verbose: true,
      });
      this.query_editor_completed(data?.[0]);
    },

    async query_active_history({ timeperiod, ...query_options }: QueryOptions) {
      const settingsStore = useSettingsStore();
      const bucketsStore = useBucketsStore();
      // Filter out periods that are already in the history, and that are in the future
      const periods = timeperiodStrsAroundTimeperiod(timeperiod).filter(tp_str => {
        return (
          !_.includes(this.active.history, tp_str) && new Date(tp_str.split('/')[0]) < new Date()
        );
      });
      let afk_buckets: string[] = [];
      const hostsList = query_options.host.split(',').map(h => h.trim());

      if (settingsStore.useMultidevice || hostsList.length > 1) {
        // get all hostnames that qualify for the multidevice query
        const hostnames = bucketsStore.hosts.filter(
          // require that the host has afk buckets,
          // and that the host is not a fakedata host,
          // unless we're explicitly querying fakedata
          host =>
            host &&
            bucketsStore.bucketsAFK(host).length > 0 &&
            hostsList.includes(host) &&
            (!host.startsWith('fakedata') || query_options.host.startsWith('fakedata'))
        );
        // get all afk buckets for all hosts
        afk_buckets = _.flatten(hostnames.map(bucketsStore.bucketsAFK));
      } else {
        afk_buckets = [this.buckets.afk[0]];
      }
      const query = queries.activityQuery(afk_buckets);
      const data = await getClient().query(periods, query, {
        name: 'activityQuery',
        verbose: true,
      });
      const active_history = _.zipObject(
        periods,
        _.map(data, pair => _.filter(pair, e => e.data.status == 'not-afk'))
      );
      this.query_active_history_completed({ active_history });
    },

    async query_category_time_by_period({
      timeperiod,
      filter_categories,
      filter_afk,
      include_stopwatch,
      dontQueryInactive,
      always_active_pattern,
    }: QueryOptions & { dontQueryInactive: boolean }) {
      console.log('ACTIVITY STORE: query_category_time_by_period STARTED.', { dontQueryInactive, filters: filter_categories });
      // TODO: Needs to be adapted for Android
      let periods: string[];
      const count = timeperiod.length[0];
      const res = timeperiod.length[1];
      if (res.startsWith('day') && count == 1) {
        // If timeperiod is a single day, we query the individual hours
        periods = timeperiodsStrsHoursOfPeriod(timeperiod);
      } else if (
        res.startsWith('day') ||
        (res.startsWith('week') && count == 1) ||
        (res.startsWith('month') && count == 1)
      ) {
        // If timeperiod is several days, or a single week/month, we query the individual days
        periods = timeperiodsStrsDaysOfPeriod(timeperiod);
      } else if (timeperiod.length[1].startsWith('year') && timeperiod.length[0] == 1) {
        // If timeperiod a single year, we query the individual months
        periods = timeperiodsStrsMonthsOfPeriod(timeperiod);
      } else {
        console.error(`Unknown timeperiod length: ${timeperiod.length}`);
      }

      // Filter out periods that start in the future
      periods = periods.filter(period => new Date(period.split('/')[0]) < new Date());
      console.log('ACTIVITY STORE: query_category_time_by_period - Calculated periods:', periods.length);

      const signal = getClient().controller.signal;
      let cancelled = false;
      signal.onabort = () => {
        cancelled = true;
        console.debug('Request aborted');
      };

      // Query one period at a time, to avoid timeout on slow queries
      let data = [];
      for (const period of periods) {
        // Not stable
        //signal.throwIfAborted();
        if (cancelled) {
          throw signal['reason'] || 'unknown reason';
        }

        // Only query periods with known data from AFK bucket
        if (dontQueryInactive && this.active.events.length > 0) {
          const start = new Date(period.split('/')[0]);
          const end = new Date(period.split('/')[1]);

          // Retrieve active time in period
          const period_activity = this.active.events.find((e: IEvent) => {
            return start < new Date(e.timestamp) && new Date(e.timestamp) < end;
          });

          // Check if there was active time
          if (!(period_activity && period_activity.duration > 0)) {
            data = data.concat([{ cat_events: [] }]);
            continue;
          }
        }

        const isAndroid = this.buckets.android[0] !== undefined;
        const categories = useCategoryStore().queryRules;
        // TODO: Clean up call, pass QueryParams in fullDesktopQuery as well
        // TODO: Unify QueryOptions and QueryParams
        const query = queries.categoryQuery({
          bid_browsers: this.buckets.browser,
          bid_stopwatch:
            include_stopwatch && this.buckets.stopwatch.length > 0
              ? this.buckets.stopwatch[0]
              : undefined,
          categories,
          filter_categories,
          filter_afk,
          always_active_pattern,
          ...(isAndroid
            ? {
              bid_android: this.buckets.android[0],
            }
            : {
              bid_afk: this.buckets.afk[0],
              bid_window: this.buckets.window[0],
            }),
        });
        const result = await getClient().query([period], query, {
          verbose: true,
          name: 'categoryQuery',
        });
        data = data.concat(result);
      }

      // Zip periods
      let by_period = _.zipObject(periods, data);
      // Filter out values that are undefined (no longer needed, only used when visualization was progressive (looks buggy))
      by_period = _.fromPairs(_.toPairs(by_period).filter(o => o[1]));

      console.log('ACTIVITY STORE: query_category_time_by_period - Data ready to commit.', { periods: Object.keys(by_period).length });
      this.query_category_time_by_period_completed({ by_period });
    },

    async query_active_history_android({ timeperiod }: QueryOptions) {
      const periods = timeperiodStrsAroundTimeperiod(timeperiod).filter(tp_str => {
        return !_.includes(this.active.history, tp_str);
      });
      const data = await getClient().query(
        periods,
        queries.activityQueryAndroid(this.buckets.android[0])
      );
      const active_history = _.zipObject(periods, data);
      const active_history_events = _.mapValues(
        active_history,
        (duration: number, key): [IEvent] => {
          return [{ timestamp: key.split('/')[0], duration, data: { status: 'not-afk' } }];
        }
      );
      this.query_active_history_completed({ active_history: active_history_events });
    },

    set_available(this: State) {
      // TODO: Move to bucketStore on a per-host basis?
      this.window.available = this.buckets.afk.length > 0 && this.buckets.window.length > 0;
      this.browser.available =
        this.buckets.afk.length > 0 &&
        this.buckets.window.length > 0 &&
        this.buckets.browser.length > 0;
      this.active.available = this.buckets.afk.length > 0;
      this.editor.available = this.buckets.editor.length > 0;
      this.android.available = this.buckets.android.length > 0;
      this.category.available = this.window.available || this.android.available;
      this.stopwatch.available = this.buckets.stopwatch.length > 0;
    },

    async get_buckets(this: State, { host }) {
      // TODO: Move to bucketStore on a per-host basis?
      const bucketsStore = useBucketsStore();
      const hosts = host.split(',').map(h => h.trim());

      this.buckets.afk = _.flatten(hosts.map(h => bucketsStore.bucketsAFK(h)));
      this.buckets.window = _.flatten(hosts.map(h => bucketsStore.bucketsWindow(h)));
      this.buckets.android = _.flatten(hosts.map(h => bucketsStore.bucketsAndroid(h)));
      this.buckets.browser = _.flatten(hosts.map(h => bucketsStore.bucketsBrowser(h)));
      this.buckets.editor = _.flatten(hosts.map(h => bucketsStore.bucketsEditor(h)));
      this.buckets.stopwatch = _.flatten(hosts.map(h => bucketsStore.bucketsStopwatch(h)));

      console.log('Available buckets: ', this.buckets);
      this.buckets.loaded = true;
    },

    async load_demo() {
      // A function to load some demo data (for screenshots and stuff)

      this.start_loading({});

      function groupSumEventsBy(events, key, f) {
        return flow(
          filter(f),
          groupBy(f),
          values,
          map((es: any) => {
            return { duration: _.sumBy(es, 'duration'), data: { [key]: f(es[0]) } };
          }),
          sortBy('duration'),
          reverse
        )(events);
      }

      const app_events = groupSumEventsBy(window_events, 'app', (e: any) => e.data.app);
      const title_events = groupSumEventsBy(window_events, 'title', (e: any) => e.data.title);
      const cat_events = groupSumEventsBy(window_events, '$category', (e: any) => e.data.$category);
      const url_events = groupSumEventsBy(window_events, 'url', (e: any) => e.data.url);
      const domain_events = groupSumEventsBy(window_events, '$domain', (e: any) =>
        e.data.url === undefined ? '' : new URL(e.data.url).host
      );
      const browser_title_events = groupSumEventsBy(
        window_events.filter((e: any) => e.data.url),
        'title',
        (e: any) => e.data.title
      );

      this.query_window_completed({
        duration: _.sumBy(window_events, 'duration'),
        app_events,
        title_events,
        cat_events,
        active_events: [
          {
            timestamp: new Date().toISOString(),
            duration: 1.5 * 60 * 60,
            data: { afk: 'not-afk' },
          },
        ],
      });

      this.buckets.browser = ['aw-watcher-firefox'];
      this.query_browser_completed({
        duration: _.sumBy(url_events, 'duration'),
        domains: domain_events,
        urls: url_events,
        titles: browser_title_events,
      });

      this.buckets.editor = ['aw-watcher-vim'];
      this.query_editor_completed({
        duration: 30,
        files: [{ duration: 10, data: { file: 'test.py' } }],
        languages: [{ duration: 10, data: { language: 'python' } }],
        projects: [{ duration: 10, data: { project: 'aw-core' } }],
      });

      this.buckets.loaded = true;

      // fetch startOfDay from settings store
      const settingsStore = useSettingsStore();
      const startOfDay = settingsStore.startOfDay;

      function build_active_history() {
        const active_history = {};
        let current_day = moment(get_day_start_with_offset(null, startOfDay));
        _.map(_.range(0, 30), () => {
          const current_day_end = moment(current_day).add(1, 'day');
          active_history[`${current_day.format()}/${current_day_end.format()}`] = [
            {
              timestamp: current_day.format(),
              duration: 100 + 900 * Math.random(),
              data: { status: 'not-afk' },
            },
          ];
          current_day = current_day.add(-1, 'day');
        });
        return active_history;
      }
      this.query_active_history_completed({ active_history: build_active_history() });

      function build_by_period() {
        const by_period: any = {};
        let current_hour = moment(get_day_start_with_offset(null, startOfDay)).startOf('hour');
        for (let i = 0; i < 24; i++) {
          const next_hour = moment(current_hour).add(1, 'hour');
          const key = `${current_hour.format()}/${next_hour.format()}`;
          const cat_events = [];

          // Create a nice distribution of activities for a vivid chart
          if (i >= 9 && i <= 17) {
            // Work hours
            cat_events.push({
              duration: Math.random() * 2000 + 1000,
              data: { $category: ['Work', 'Programming', 'ActivityWatch'] },
            });
            if (Math.random() > 0.4)
              cat_events.push({
                duration: Math.random() * 800,
                data: { $category: ['Comms', 'Video Conferencing'] },
              });
          } else if (i >= 18 && i <= 22) {
            // Evening
            if (Math.random() > 0.2)
              cat_events.push({
                duration: Math.random() * 1500 + 1000,
                data: { $category: ['Media', 'Games'] },
              });
            cat_events.push({
              duration: Math.random() * 1000 + 200,
              data: { $category: ['Media', 'Social Media'] },
            });
          } else if (i >= 8 && i <= 9) {
            // Morning
            cat_events.push({
              duration: Math.random() * 800 + 400,
              data: { $category: ['Comms', 'Email'] },
            });
          } else if (i < 2 || i >= 23) {
            // Late night
            cat_events.push({
              duration: Math.random() * 600,
              data: { $category: ['Media', 'Social Media'] },
            });
          }

          by_period[key] = { cat_events };
          current_hour = next_hour;
        }
        return by_period;
      }
      this.query_category_time_by_period_completed({ by_period: build_by_period() });
    },

    // mutations
    start_loading(this: State, query_options: QueryOptions) {
      this.loaded = true;
      this.query_options = query_options;

      // Resets the store state while waiting for new query to finish
      this.window.top_apps = null;
      this.window.top_titles = null;

      this.browser.duration = 0;
      this.browser.top_domains = null;
      this.browser.top_urls = null;
      this.browser.top_titles = null;

      this.editor.duration = 0;
      this.editor.top_files = null;
      this.editor.top_languages = null;
      this.editor.top_projects = null;

      this.category.top = null;
      this.category.by_period = null;

      this.active.duration = null;

      // Ensures that active history isn't being fully reloaded on every date change
      // (see caching done in query_active_history and query_active_history_android)
      // FIXME: Better detection of when to actually clear (such as on force reload, hostname change)
      if (Object.keys(this.active.history).length === 0) {
        this.active.history = {};
      }
    },

    query_window_completed(this: State, data: WindowQueryResult | null = null) {
      const cat_events = scoreCategories(colorCategories(ensureEventList(data?.cat_events)));

      // Set $color and $score for categories
      this.window.top_apps = ensureEventList(data?.app_events);
      this.window.top_titles = ensureEventList(data?.title_events);
      this.category.top = cat_events;
      this.active.duration = ensureDuration(data?.duration);
      this.active.events = ensureEventList(data?.active_events);

      console.log('ACTIVITY STORE: query_window_completed committed data');
    },

    query_browser_completed(this: State, data: BrowserQueryResult | null = null) {
      this.browser.top_domains = ensureEventList(data?.domains);
      this.browser.top_urls = ensureEventList(data?.urls);
      this.browser.top_titles = ensureEventList(data?.titles);
      this.browser.duration = ensureDuration(data?.duration);
    },

    query_stopwatch_completed(this: State, data: StopwatchQueryResult | null = null) {
      this.stopwatch.top_stopwatches = ensureEventList(data?.stopwatch_events);
    },

    query_editor_completed(this: State, data: EditorQueryResult | null = null) {
      this.editor.duration = ensureDuration(data?.duration);
      this.editor.top_files = ensureEventList(data?.files);
      this.editor.top_languages = ensureEventList(data?.languages);
      this.editor.top_projects = ensureEventList(data?.projects);
    },

    query_active_history_completed(this: State, { active_history } = { active_history: {} }) {
      this.active.history = {
        ...this.active.history,
        ...ensureActiveHistory(active_history),
      };
    },

    query_category_time_by_period_completed(this: State, { by_period } = { by_period: {} }) {
      this.category.by_period = ensureByPeriod(by_period);
      console.log('ACTIVITY STORE: query_category_time_by_period_completed committed by_period');
    },
  },
});
