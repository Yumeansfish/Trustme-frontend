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
import { getColorFromString } from '~/features/categorization/lib/color';
import {
  compileQueryCategoryRules,
  matchCompiledCategoryNameAgainstTexts,
  UNCATEGORIZED_CATEGORY_NAME,
  type QueryCategoryRule,
} from '~/features/categorization/lib/categoryRules';

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
    const category = normalizeCategory(e.data?.['$category']);
    e.data['$color'] = categoryStore.classes.some(c => _.isEqual(c.name, category))
      ? categoryStore.get_category_color(category)
      : getColorFromString(category.join(' > '));
    return e;
  });
}

function scoreCategories(events: IEvent[]): IEvent[] {
  // Set $score for categories
  const categoryStore = useCategoryStore();
  return events.map((e: IEvent) => {
    const category = normalizeCategory(e.data?.['$category']);
    e.data['$score'] = categoryStore.classes.some(c => _.isEqual(c.name, category))
      ? categoryStore.get_category_score(category)
      : 0;
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
  requested_visualizations?: string[];
}

type MaybeLoadedList<T> = T[] | null;
type CategoryPeriodData = Record<string, { cat_events: IEvent[] }>;
interface CategoryPeriodCache {
  key: string | null;
  fetched_until: string | null;
  events: IEvent[];
}

const CATEGORY_PERIOD_INCREMENTAL_GUARD_SECONDS = 120;
const LOCAL_AGGREGATION_LIMIT = 100;
const APP_VISUALIZATIONS = new Set(['top_apps']);
const EDITOR_VISUALIZATIONS = new Set([
  'top_editor_files',
  'top_editor_languages',
  'top_editor_projects',
]);
const CATEGORY_PERIOD_VISUALIZATIONS = new Set(['timeline_barchart']);
const CATEGORY_TOP_VISUALIZATIONS = new Set([
  'top_categories',
  'category_donut',
  'category_tree',
  'category_sunburst',
  'score',
]);
const WINDOW_TITLE_VISUALIZATIONS = new Set(['top_titles']);
const BROWSER_VISUALIZATIONS = new Set(['top_domains', 'top_urls', 'top_browser_titles']);

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

interface DesktopEventsQueryResult {
  events?: IEvent[] | null;
  active_events?: IEvent[] | null;
  stopwatch_events?: IEvent[] | null;
}

function ensureEventList(events: unknown): IEvent[] {
  return Array.isArray(events) ? [...events] : [];
}

function ensureDuration(duration: unknown): number {
  return typeof duration === 'number' && Number.isFinite(duration) ? duration : 0;
}

function ensureActiveHistory(active_history: unknown): Record<string, IEvent[]> {
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

function sumEventDurations(events: IEvent[]): number {
  return events.reduce((total, event) => total + ensureDuration(event.duration), 0);
}

function manualAwayCategoryFromData(data: Record<string, unknown>): string[] | null {
  const explicitCategory = data['$category'];
  if (Array.isArray(explicitCategory) && explicitCategory.length > 0) {
    return explicitCategory.map(part => String(part));
  }
  if (typeof explicitCategory === 'string' && explicitCategory.trim().length > 0) {
    return [explicitCategory.trim()];
  }

  const isManualAway =
    data['$manual_away'] === true ||
    (typeof data.label === 'string' && typeof data.running === 'boolean');
  if (!isManualAway) {
    return null;
  }

  const label = typeof data.label === 'string' ? data.label.trim() : '';
  return label.length > 0 ? [label] : [...UNCATEGORIZED_CATEGORY_NAME];
}

function categorizeEventsLocally(events: IEvent[], queryRules: QueryCategoryRule[]): IEvent[] {
  const compiledRules = compileQueryCategoryRules(queryRules);
  const categoryCache = new Map<string, string[]>();

  return events.map(event => {
    const data = event.data || {};
    const manualAwayCategory = manualAwayCategoryFromData(data);
    if (manualAwayCategory) {
      return {
        ...event,
        data: {
          ...data,
          $category: [...manualAwayCategory],
        },
      };
    }

    const app = typeof data.app === 'string' ? data.app : '';
    const title = typeof data.title === 'string' ? data.title : '';
    const cacheKey = `${app}\u0000${title}`;

    let matchedCategoryName = categoryCache.get(cacheKey);
    if (!matchedCategoryName) {
      matchedCategoryName = matchCompiledCategoryNameAgainstTexts([app, title], compiledRules) || [
        ...UNCATEGORIZED_CATEGORY_NAME,
      ];
      categoryCache.set(cacheKey, matchedCategoryName);
    }

    return {
      ...event,
      data: {
        ...data,
        $category: [...matchedCategoryName],
      },
    };
  });
}

function filterEventsByCategories(events: IEvent[], filterCategories?: string[][]): IEvent[] {
  if (!Array.isArray(filterCategories) || filterCategories.length === 0) {
    return events;
  }

  const allowed = new Set(filterCategories.map(category => JSON.stringify(category)));
  return events.filter(event =>
    allowed.has(JSON.stringify(normalizeCategory(event.data?.['$category'])))
  );
}

function aggregateEventsByDataKeys(
  events: IEvent[],
  keys: string[],
  limit = LOCAL_AGGREGATION_LIMIT
): IEvent[] {
  const grouped = new Map<string, { duration: number; timestampMs: number; values: unknown[] }>();

  for (const event of events) {
    const dataValues = keys.map(key => event.data?.[key]);
    const groupKey = JSON.stringify(dataValues);
    const duration = ensureDuration(event.duration);
    const startMs = new Date(event.timestamp).getTime();
    const timestampMs = Number.isFinite(startMs) ? startMs : Date.now();
    const current = grouped.get(groupKey);

    if (current) {
      current.duration += duration;
      current.timestampMs = Math.min(current.timestampMs, timestampMs);
    } else {
      grouped.set(groupKey, {
        duration,
        timestampMs,
        values: dataValues,
      });
    }
  }

  return [...grouped.values()]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit)
    .map(entry => ({
      timestamp: new Date(entry.timestampMs).toISOString(),
      duration: entry.duration,
      data: Object.fromEntries(keys.map((key, index) => [key, entry.values[index]])),
    }));
}

function eventHasStringDataKey(event: IEvent, key: string): boolean {
  const value = event.data?.[key];
  return typeof value === 'string' && value.trim().length > 0;
}

function filterEventsByNonEmptyStringData(events: IEvent[], key: string): IEvent[] {
  return events.filter(event => eventHasStringDataKey(event, key));
}

function hasRequestedVisualization(query_options: QueryOptions, candidates: Set<string>): boolean {
  if (!Array.isArray(query_options.requested_visualizations)) {
    return true;
  }

  if (query_options.requested_visualizations.length === 0) {
    return false;
  }

  return query_options.requested_visualizations.some(type => candidates.has(type));
}

function periodHasActivity(period: string, active_events: IEvent[]): boolean {
  const [startIso, endIso] = period.split('/');
  const periodStart = new Date(startIso).getTime();
  const periodEnd = new Date(endIso).getTime();

  return active_events.some(event => {
    const eventStart = new Date(event.timestamp).getTime();
    const eventEnd = eventStart + ensureDuration(event.duration) * 1000;
    return eventStart < periodEnd && eventEnd > periodStart;
  });
}

function buildCategoryPeriods(timeperiod: TimePeriod): string[] {
  const count = timeperiod.length[0];
  const resolution = timeperiod.length[1];

  if (resolution.startsWith('day') && count === 1) {
    return timeperiodsStrsHoursOfPeriod(timeperiod);
  }

  if (
    resolution.startsWith('day') ||
    (resolution.startsWith('week') && count === 1) ||
    (resolution.startsWith('month') && count === 1)
  ) {
    return timeperiodsStrsDaysOfPeriod(timeperiod);
  }

  if (resolution.startsWith('year') && count === 1) {
    return timeperiodsStrsMonthsOfPeriod(timeperiod);
  }

  console.error(`Unknown timeperiod length: ${timeperiod.length}`);
  return [];
}

interface PeriodBound {
  key: string;
  startMs: number;
  endMs: number;
}

function buildPeriodBounds(periods: string[]): PeriodBound[] {
  return periods
    .map(period => {
      const [startIso, endIso] = period.split('/');
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(endIso).getTime();
      return { key: period, startMs, endMs };
    })
    .filter(period => Number.isFinite(period.startMs) && Number.isFinite(period.endMs));
}

function normalizeCategory(category: unknown): string[] {
  if (Array.isArray(category) && category.length > 0) {
    return category.map(part => String(part));
  }
  if (typeof category === 'string' && category.length > 0) {
    return [category];
  }
  return ['Uncategorized'];
}

function findFirstOverlappingPeriod(periodBounds: PeriodBound[], eventStartTimeMs: number): number {
  let low = 0;
  let high = periodBounds.length;

  while (low < high) {
    const mid = (low + high) >> 1;
    if (periodBounds[mid].endMs <= eventStartTimeMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

function eventStartMs(event: IEvent): number {
  return new Date(event.timestamp).getTime();
}

function eventEndMs(event: IEvent): number {
  const start = eventStartMs(event);
  const durationMs = ensureDuration(event.duration) * 1000;
  return start + durationMs;
}

function buildCategoryByPeriodFromEvents(periods: string[], events: IEvent[]): CategoryPeriodData {
  const periodBounds = buildPeriodBounds(periods);
  const byPeriodMaps = periodBounds.map(
    () => new Map<string, { category: string[]; duration: number }>()
  );
  const sortedEvents = [...events].sort((a, b) => eventStartMs(a) - eventStartMs(b));

  for (const event of sortedEvents) {
    const startMs = eventStartMs(event);
    const endMs = eventEndMs(event);

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      continue;
    }

    const category = normalizeCategory(event.data?.['$category']);
    const categoryKey = JSON.stringify(category);
    let periodIndex = findFirstOverlappingPeriod(periodBounds, startMs);

    while (periodIndex < periodBounds.length && periodBounds[periodIndex].startMs < endMs) {
      const period = periodBounds[periodIndex];
      const overlapStart = Math.max(startMs, period.startMs);
      const overlapEnd = Math.min(endMs, period.endMs);

      if (overlapEnd > overlapStart) {
        const durationSeconds = (overlapEnd - overlapStart) / 1000;
        const existing = byPeriodMaps[periodIndex].get(categoryKey);
        if (existing) {
          existing.duration += durationSeconds;
        } else {
          byPeriodMaps[periodIndex].set(categoryKey, {
            category,
            duration: durationSeconds,
          });
        }
      }

      periodIndex += 1;
    }
  }

  const byPeriod: CategoryPeriodData = {};
  periodBounds.forEach((period, periodIndex) => {
    const cat_events = [...byPeriodMaps[periodIndex].values()]
      .filter(entry => entry.duration > 0)
      .sort((a, b) => b.duration - a.duration)
      .map(entry => ({
        timestamp: new Date(period.startMs).toISOString(),
        duration: entry.duration,
        data: { $category: entry.category },
      }));

    byPeriod[period.key] = { cat_events };
  });

  periods.forEach(period => {
    if (!byPeriod[period]) {
      byPeriod[period] = { cat_events: [] };
    }
  });

  return byPeriod;
}

interface State {
  loaded: boolean;
  request_nonce: number;
  active_request_nonce: number;

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
    period_cache: CategoryPeriodCache;
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
    request_nonce: 0,
    active_request_nonce: 0,

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
      period_cache: {
        key: null,
        fetched_until: null,
        events: [],
      },
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
    isAbortError(error: unknown) {
      if (!error || typeof error !== 'object') {
        return false;
      }

      const maybeError = error as { code?: string; name?: string; message?: string };
      const message = (maybeError.message || '').toLowerCase();
      return (
        maybeError.code === 'ERR_CANCELED' ||
        maybeError.name === 'CanceledError' ||
        message.includes('canceled') ||
        message.includes('aborted')
      );
    },

    isCurrentRequest(this: State, request_nonce: number) {
      return request_nonce === this.active_request_nonce;
    },

    shouldQueryEditor(query_options: QueryOptions) {
      return hasRequestedVisualization(query_options, EDITOR_VISUALIZATIONS);
    },

    shouldQueryCategoryTimeByPeriod(query_options: QueryOptions) {
      return hasRequestedVisualization(query_options, CATEGORY_PERIOD_VISUALIZATIONS);
    },

    shouldIncludeWindowTitles(query_options: QueryOptions) {
      return hasRequestedVisualization(query_options, WINDOW_TITLE_VISUALIZATIONS);
    },

    shouldIncludeBrowserData(query_options: QueryOptions) {
      return hasRequestedVisualization(query_options, BROWSER_VISUALIZATIONS);
    },

    shouldIncludeStopwatchData(query_options: QueryOptions) {
      return Boolean(query_options.include_stopwatch);
    },

    buildCategoryPeriodCacheKey(
      query_options: QueryOptions,
      isAndroid: boolean,
      periodRange: string
    ): string {
      const categoryStore = useCategoryStore();
      return JSON.stringify({
        host: query_options.host,
        periodRange,
        isAndroid,
        filter_afk: Boolean(query_options.filter_afk),
        include_audible: Boolean(query_options.include_audible),
        include_stopwatch: Boolean(query_options.include_stopwatch),
        always_active_pattern: query_options.always_active_pattern || '',
        filter_categories: query_options.filter_categories || [],
        categories: categoryStore.queryRules,
        buckets: {
          afk: [...this.buckets.afk],
          window: [...this.buckets.window],
          browser: [...this.buckets.browser],
          android: [...this.buckets.android],
          stopwatch: [...this.buckets.stopwatch],
        },
      });
    },

    resetRequestedVisuals(query_options: QueryOptions) {
      if (hasRequestedVisualization(query_options, APP_VISUALIZATIONS)) {
        this.window.top_apps = null;
      }

      if (this.shouldIncludeWindowTitles(query_options)) {
        this.window.top_titles = null;
      }

      if (hasRequestedVisualization(query_options, CATEGORY_TOP_VISUALIZATIONS)) {
        this.category.top = null;
      }

      if (this.shouldIncludeBrowserData(query_options)) {
        this.browser.duration = 0;
        this.browser.top_domains = null;
        this.browser.top_urls = null;
        this.browser.top_titles = null;
      }

      if (this.shouldQueryEditor(query_options)) {
        this.editor.duration = 0;
        this.editor.top_files = null;
        this.editor.top_languages = null;
        this.editor.top_projects = null;
      }

      if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
        this.category.by_period = null;
      }
    },

    async loadDeferredData(query_options: QueryOptions, request_nonce: number) {
      try {
        // Let the main snapshot render before starting the heavy backfill work.
        await new Promise(resolve => setTimeout(resolve, 0));
        if (!this.isCurrentRequest(request_nonce)) return;

        if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
          if (this.window.available || this.android.available) {
            await this.query_category_time_by_period(query_options, request_nonce);
          } else {
            this.query_category_time_by_period_completed(undefined, request_nonce);
          }
        }

        if (!this.isCurrentRequest(request_nonce)) return;

        if (this.active.available) {
          await this.query_active_history(query_options, request_nonce);
        } else if (this.android.available) {
          await this.query_active_history_android(query_options, request_nonce);
        } else {
          this.query_active_history_completed(undefined, request_nonce);
        }
      } catch (error) {
        if (this.isAbortError(error) || !this.isCurrentRequest(request_nonce)) {
          return;
        }

        console.error('Deferred activity queries failed', error);
      }
    },

    async ensure_loaded(query_options: QueryOptions) {
      console.log('--- ACTIVITY STORE: ensure_loaded called with options ---', query_options);
      const settingsStore = useSettingsStore();
      await settingsStore.ensureLoaded();

      const bucketsStore = useBucketsStore();

      console.info('Query options: ', query_options);
      if (this.loaded) {
        await getClient().abort();
      }
      if (!this.loaded || this.query_options !== query_options || query_options.force) {
        console.log('ACTIVITY STORE: Actually loading data now...');
        const request_nonce = this.start_loading(query_options);

        try {
          if (!query_options.timeperiod) {
            query_options.timeperiod = dateToTimeperiod(
              query_options.date,
              settingsStore.startOfDay
            );
          }

          await bucketsStore.ensureLoaded();
          if (!this.isCurrentRequest(request_nonce)) return;

          await this.get_buckets(query_options);
          if (!this.isCurrentRequest(request_nonce)) return;

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
              await this.query_multidevice_full(query_options, hostnames, request_nonce);
            } else {
              await this.query_desktop_full(query_options, request_nonce);
            }
          } else if (this.android.available) {
            await this.query_android(query_options, request_nonce);
          } else {
            console.log(
              'Cannot query windows as we are missing either an afk/window bucket pair or an android bucket'
            );
            this.query_window_completed(undefined, request_nonce);
            this.query_category_time_by_period_completed(undefined, request_nonce);
          }

          if (!this.isCurrentRequest(request_nonce)) return;

          if (this.shouldQueryEditor(query_options)) {
            if (this.editor.available) {
              await this.query_editor(query_options, request_nonce);
            } else {
              console.log('Cannot call query_editor as we do not have any editor buckets');
              this.query_editor_completed(undefined, request_nonce);
            }
          }

          if (!this.isCurrentRequest(request_nonce)) return;

          if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
            this.category.by_period = null;
          }

          void this.loadDeferredData(query_options, request_nonce);
        } catch (error) {
          if (this.isAbortError(error) || !this.isCurrentRequest(request_nonce)) {
            console.debug('Skipping aborted or stale activity request');
            return;
          }
          throw error;
        }
      } else {
        console.warn(
          'ensure_loaded called twice with same query_options but without query_options.force = true, skipping...'
        );
      }
    },

    async query_android({ timeperiod, filter_categories }: QueryOptions, request_nonce: number) {
      const periods = [timeperiodToStr(timeperiod)];
      const categoryStore = useCategoryStore();
      const q = queries.appQuery(
        this.buckets.android[0],
        categoryStore.queryRules,
        filter_categories
      );
      const data = await getClient().query(periods, q);
      if (!this.isCurrentRequest(request_nonce)) return;
      this.query_window_completed(data?.[0], request_nonce);
    },

    async reset() {
      await getClient().abort();
      this.request_nonce += 1;
      this.active_request_nonce = this.request_nonce;
      this.loaded = false;
      this.query_options = null;
      this.active.history = {};
      this.category.period_cache = {
        key: null,
        fetched_until: null,
        events: [],
      };
      this.query_window_completed({});
      this.query_browser_completed({});
      this.query_stopwatch_completed({});
      this.editor.available = false;
      this.query_editor_completed({});
      this.query_category_time_by_period_completed({});
    },

    async query_multidevice_full(
      query_options: QueryOptions,
      hosts: string[],
      request_nonce: number
    ) {
      const {
        timeperiod,
        filter_categories,
        filter_afk,
        include_stopwatch,
        always_active_pattern,
      } = query_options;
      const periods = [timeperiodToStr(timeperiod)];
      const categories = useCategoryStore().queryRules;
      const include_window_titles = this.shouldIncludeWindowTitles(query_options);
      const include_stopwatch_data = this.shouldIncludeStopwatchData(query_options);

      const q = queries.multideviceEventsQuery({
        hosts,
        filter_afk,
        categories: [],
        filter_categories: [],
        bid_stopwatch:
          include_stopwatch && include_stopwatch_data && this.buckets.stopwatch.length > 0
            ? this.buckets.stopwatch[0]
            : undefined,
        host_params: {},
        always_active_pattern,
      });
      const data = await getClient().query(periods, q, {
        name: 'multideviceEventsQuery',
        verbose: true,
      });
      if (!this.isCurrentRequest(request_nonce)) return;

      const result: DesktopEventsQueryResult = data?.[0] || {};
      const rawEvents = ensureEventList(result.events);
      const activeEvents = ensureEventList(result.active_events);
      const categorizedEvents = categorizeEventsLocally(rawEvents, categories);
      const filteredEvents = filterEventsByCategories(categorizedEvents, filter_categories);
      const appSourceEvents = filterEventsByNonEmptyStringData(filteredEvents, 'app');
      const titleSourceEvents = filterEventsByNonEmptyStringData(appSourceEvents, 'title');
      const titleEvents = include_window_titles
        ? aggregateEventsByDataKeys(titleSourceEvents, ['app', 'title'])
        : [];
      const appEvents = include_window_titles
        ? aggregateEventsByDataKeys(titleEvents, ['app'])
        : aggregateEventsByDataKeys(appSourceEvents, ['app']);
      const catEvents = aggregateEventsByDataKeys(filteredEvents, ['$category']);

      this.query_window_completed(
        {
          app_events: appEvents,
          title_events: titleEvents,
          cat_events: catEvents,
          active_events: activeEvents,
          duration: sumEventDurations(filteredEvents),
        },
        request_nonce
      );
    },

    async query_desktop_full(query_options: QueryOptions, request_nonce: number) {
      const {
        timeperiod,
        filter_categories,
        filter_afk,
        include_audible,
        include_stopwatch,
        always_active_pattern,
      } = query_options;
      const periods = [timeperiodToStr(timeperiod)];
      const categories = useCategoryStore().queryRules;
      const include_window_titles = this.shouldIncludeWindowTitles(query_options);
      const include_browser_data = this.shouldIncludeBrowserData(query_options);
      const include_stopwatch_data = this.shouldIncludeStopwatchData(query_options);

      // Browser aggregation is still done server-side. When browser visualizations are not requested,
      // we can skip expensive server-side categorization/aggregation and do lightweight local aggregation.
      if (!include_browser_data) {
        const q = queries.desktopEventsQuery({
          bid_window: this.buckets.window[0],
          bid_afk: this.buckets.afk[0],
          bid_browsers: this.buckets.browser,
          bid_stopwatch:
            include_stopwatch && this.buckets.stopwatch.length > 0
              ? this.buckets.stopwatch[0]
              : undefined,
          filter_afk,
          categories: [],
          filter_categories: [],
          include_audible,
          always_active_pattern,
          include_stopwatch_data,
        });
        const data = await getClient().query(periods, q, {
          name: 'desktopEventsQuery',
          verbose: true,
        });
        if (!this.isCurrentRequest(request_nonce)) return;

        const result: DesktopEventsQueryResult = data?.[0] || {};
        const rawEvents = ensureEventList(result.events);
        const activeEvents = ensureEventList(result.active_events);
        const categorizedEvents = categorizeEventsLocally(rawEvents, categories);
        const filteredEvents = filterEventsByCategories(categorizedEvents, filter_categories);
        const appSourceEvents = filterEventsByNonEmptyStringData(filteredEvents, 'app');
        const titleSourceEvents = filterEventsByNonEmptyStringData(appSourceEvents, 'title');
        const titleEvents = include_window_titles
          ? aggregateEventsByDataKeys(titleSourceEvents, ['app', 'title'])
          : [];
        const appEvents = include_window_titles
          ? aggregateEventsByDataKeys(titleEvents, ['app'])
          : aggregateEventsByDataKeys(appSourceEvents, ['app']);
        const catEvents = aggregateEventsByDataKeys(filteredEvents, ['$category']);

        this.query_window_completed(
          {
            app_events: appEvents,
            title_events: titleEvents,
            cat_events: catEvents,
            active_events: activeEvents,
            duration: sumEventDurations(filteredEvents),
          },
          request_nonce
        );
        this.query_browser_completed(
          { domains: [], urls: [], titles: [], duration: 0 },
          request_nonce
        );

        if (include_stopwatch_data) {
          const stopwatch_events = aggregateEventsByDataKeys(
            ensureEventList(result.stopwatch_events),
            ['label']
          );
          this.query_stopwatch_completed({ stopwatch_events }, request_nonce);
        } else {
          this.query_stopwatch_completed({ stopwatch_events: [] }, request_nonce);
        }
        return;
      }

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
        include_window_titles,
        include_browser_data,
        include_stopwatch_data,
      });
      const data = await getClient().query(periods, q, {
        name: 'fullDesktopQuery',
        verbose: true,
      });
      if (!this.isCurrentRequest(request_nonce)) return;
      this.query_window_completed(data?.[0]?.window, request_nonce);
      this.query_browser_completed(data?.[0]?.browser, request_nonce);
      if (include_stopwatch_data) {
        this.query_stopwatch_completed(data?.[0]?.stopwatch, request_nonce);
      } else {
        this.query_stopwatch_completed({ stopwatch_events: [] }, request_nonce);
      }
    },

    async query_editor({ timeperiod }: QueryOptions, request_nonce: number) {
      const periods = [timeperiodToStr(timeperiod)];
      const q = queries.editorActivityQuery(this.buckets.editor);
      const data = await getClient().query(periods, q, {
        name: 'editorActivityQuery',
        verbose: true,
      });
      if (!this.isCurrentRequest(request_nonce)) return;
      this.query_editor_completed(data?.[0], request_nonce);
    },

    async query_active_history(
      { timeperiod, ...query_options }: QueryOptions,
      request_nonce: number
    ) {
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
      if (!this.isCurrentRequest(request_nonce)) return;
      const active_history = _.zipObject(
        periods,
        _.map(data, pair => _.filter(pair, e => e.data.status == 'not-afk'))
      );
      this.query_active_history_completed({ active_history }, request_nonce);
    },

    async query_category_time_by_period(
      {
        timeperiod,
        host,
        filter_categories,
        filter_afk,
        include_audible,
        include_stopwatch,
        dont_query_inactive,
        always_active_pattern,
      }: QueryOptions,
      request_nonce: number
    ) {
      console.log('ACTIVITY STORE: query_category_time_by_period STARTED.', {
        dont_query_inactive,
        filters: filter_categories,
      });
      let periods = buildCategoryPeriods(timeperiod);

      // Filter out periods that start in the future
      periods = periods.filter(period => new Date(period.split('/')[0]) < new Date());

      if (periods.length === 0) {
        this.query_category_time_by_period_completed({ by_period: {} }, request_nonce);
        return;
      }

      console.log(
        'ACTIVITY STORE: query_category_time_by_period - Calculated periods:',
        periods.length
      );

      const periodRange = timeperiodToStr(timeperiod);
      const [periodStartIso, periodEndIso] = periodRange.split('/');
      const periodStartMs = new Date(periodStartIso).getTime();
      const periodEndMs = new Date(periodEndIso).getTime();
      const nowMs = Date.now();
      const effectiveEndMs = Math.min(periodEndMs, nowMs);

      const isAndroid = this.buckets.android[0] !== undefined;
      const categories = useCategoryStore().queryRules;
      const query = queries.categoryEventsQuery({
        bid_browsers: this.buckets.browser,
        bid_stopwatch:
          include_stopwatch && this.buckets.stopwatch.length > 0
            ? this.buckets.stopwatch[0]
            : undefined,
        categories: [],
        filter_categories: [],
        filter_afk,
        include_audible,
        browser_events_mode: include_audible ? 'presence' : 'none',
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

      const cacheKey = this.buildCategoryPeriodCacheKey(
        {
          timeperiod,
          host,
          filter_categories,
          filter_afk,
          include_audible,
          include_stopwatch,
          dont_query_inactive,
          always_active_pattern,
        },
        isAndroid,
        periodRange
      );

      const cacheMatches = this.category.period_cache.key === cacheKey;
      let categorizedEvents = cacheMatches ? [...this.category.period_cache.events] : [];
      let fetchStartMs = periodStartMs;

      if (cacheMatches && this.category.period_cache.fetched_until) {
        const fetchedUntilMs = new Date(this.category.period_cache.fetched_until).getTime();
        if (Number.isFinite(fetchedUntilMs)) {
          fetchStartMs = Math.max(
            periodStartMs,
            fetchedUntilMs - CATEGORY_PERIOD_INCREMENTAL_GUARD_SECONDS * 1000
          );
        }
      }

      if (
        Number.isFinite(periodStartMs) &&
        Number.isFinite(effectiveEndMs) &&
        effectiveEndMs > fetchStartMs
      ) {
        if (!this.isCurrentRequest(request_nonce)) return;
        const queryRange = `${new Date(fetchStartMs).toISOString()}/${new Date(
          effectiveEndMs
        ).toISOString()}`;
        const result = await getClient().query([queryRange], query, {
          verbose: true,
          name: 'categoryEventsQuery',
        });
        if (!this.isCurrentRequest(request_nonce)) return;

        const deltaEvents = filterEventsByCategories(
          categorizeEventsLocally(ensureEventList(result?.[0]?.events), categories),
          filter_categories
        );
        if (cacheMatches && categorizedEvents.length > 0) {
          categorizedEvents = categorizedEvents.filter(event => {
            const endMs = eventEndMs(event);
            return Number.isFinite(endMs) && endMs <= fetchStartMs;
          });
          categorizedEvents = [...categorizedEvents, ...deltaEvents];
        } else {
          categorizedEvents = deltaEvents;
        }
      }

      categorizedEvents = categorizedEvents
        .filter(event => {
          const startMs = eventStartMs(event);
          const endMs = eventEndMs(event);
          return (
            Number.isFinite(startMs) &&
            Number.isFinite(endMs) &&
            endMs > periodStartMs &&
            startMs < effectiveEndMs
          );
        })
        .sort((a, b) => eventStartMs(a) - eventStartMs(b));

      this.category.period_cache = {
        key: cacheKey,
        fetched_until:
          Number.isFinite(effectiveEndMs) && effectiveEndMs > 0
            ? new Date(effectiveEndMs).toISOString()
            : null,
        events: categorizedEvents,
      };

      const by_period = buildCategoryByPeriodFromEvents(periods, categorizedEvents);
      if (dont_query_inactive && this.active.events.length > 0) {
        periods.forEach(period => {
          if (!periodHasActivity(period, this.active.events)) {
            by_period[period] = { cat_events: [] };
          }
        });
      }

      const ordered_by_period = Object.fromEntries(
        periods.map(period => [period, by_period[period] || { cat_events: [] }])
      );

      console.log('ACTIVITY STORE: query_category_time_by_period - Data ready to commit.', {
        periods: Object.keys(ordered_by_period).length,
      });
      this.query_category_time_by_period_completed({ by_period: ordered_by_period }, request_nonce);
    },

    async query_active_history_android({ timeperiod }: QueryOptions, request_nonce: number) {
      const periods = timeperiodStrsAroundTimeperiod(timeperiod).filter(tp_str => {
        return !_.includes(this.active.history, tp_str);
      });
      const data = await getClient().query(
        periods,
        queries.activityQueryAndroid(this.buckets.android[0])
      );
      if (!this.isCurrentRequest(request_nonce)) return;
      const active_history = _.zipObject(periods, data);
      const active_history_events = _.mapValues(
        active_history,
        (duration: number, key): [IEvent] => {
          return [{ timestamp: key.split('/')[0], duration, data: { status: 'not-afk' } }];
        }
      );
      this.query_active_history_completed({ active_history: active_history_events }, request_nonce);
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
          const period_cat_events = [];

          // Create a nice distribution of activities for a vivid chart
          if (i >= 9 && i <= 17) {
            // Code-heavy hours
            period_cat_events.push({
              duration: Math.random() * 2000 + 1000,
              data: { $category: ['Code'] },
            });
            if (Math.random() > 0.4)
              period_cat_events.push({
                duration: Math.random() * 800,
                data: { $category: ['Meetings'] },
              });
          } else if (i >= 18 && i <= 22) {
            // Evening
            if (Math.random() > 0.2)
              period_cat_events.push({
                duration: Math.random() * 1500 + 1000,
                data: { $category: ['Gaming'] },
              });
            period_cat_events.push({
              duration: Math.random() * 1000 + 200,
              data: { $category: ['Browsing'] },
            });
          } else if (i >= 8 && i <= 9) {
            // Morning
            period_cat_events.push({
              duration: Math.random() * 800 + 400,
              data: { $category: ['Email'] },
            });
          } else if (i < 2 || i >= 23) {
            // Late night
            period_cat_events.push({
              duration: Math.random() * 600,
              data: { $category: ['Browsing'] },
            });
          }

          by_period[key] = { cat_events: period_cat_events };
          current_hour = next_hour;
        }
        return by_period;
      }
      this.query_category_time_by_period_completed({ by_period: build_by_period() });
    },

    // mutations
    start_loading(this: State, query_options: QueryOptions) {
      const shouldResetVisuals = this.query_options == null;
      this.loaded = true;
      this.query_options = query_options;
      this.request_nonce += 1;
      this.active_request_nonce = this.request_nonce;

      if (shouldResetVisuals) {
        // Resets the store state while waiting for the first query to finish.
        // Later refreshes keep rendering the previous snapshot until new data arrives.
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
      } else {
        this.resetRequestedVisuals(query_options);
      }

      // Ensures that active history isn't being fully reloaded on every date change
      // (see caching done in query_active_history and query_active_history_android)
      // FIXME: Better detection of when to actually clear (such as on force reload, hostname change)
      if (Object.keys(this.active.history).length === 0) {
        this.active.history = {};
      }
      return this.request_nonce;
    },

    query_window_completed(
      this: State,
      data: WindowQueryResult | null = null,
      request_nonce?: number
    ) {
      if (typeof request_nonce === 'number' && request_nonce !== this.active_request_nonce) return;
      const cat_events = scoreCategories(colorCategories(ensureEventList(data?.cat_events)));
      const active_events = ensureEventList(data?.active_events);
      const active_duration = sumEventDurations(active_events);

      // Set $color and $score for categories
      this.window.top_apps = ensureEventList(data?.app_events);
      this.window.top_titles = ensureEventList(data?.title_events);
      this.category.top = cat_events;
      this.active.duration = active_duration > 0 ? active_duration : ensureDuration(data?.duration);
      this.active.events = active_events;

      console.log('ACTIVITY STORE: query_window_completed committed data');
    },

    query_browser_completed(
      this: State,
      data: BrowserQueryResult | null = null,
      request_nonce?: number
    ) {
      if (typeof request_nonce === 'number' && request_nonce !== this.active_request_nonce) return;
      this.browser.top_domains = ensureEventList(data?.domains);
      this.browser.top_urls = ensureEventList(data?.urls);
      this.browser.top_titles = ensureEventList(data?.titles);
      this.browser.duration = ensureDuration(data?.duration);
    },

    query_stopwatch_completed(
      this: State,
      data: StopwatchQueryResult | null = null,
      request_nonce?: number
    ) {
      if (typeof request_nonce === 'number' && request_nonce !== this.active_request_nonce) return;
      this.stopwatch.top_stopwatches = ensureEventList(data?.stopwatch_events);
    },

    query_editor_completed(
      this: State,
      data: EditorQueryResult | null = null,
      request_nonce?: number
    ) {
      if (typeof request_nonce === 'number' && request_nonce !== this.active_request_nonce) return;
      this.editor.duration = ensureDuration(data?.duration);
      this.editor.top_files = ensureEventList(data?.files);
      this.editor.top_languages = ensureEventList(data?.languages);
      this.editor.top_projects = ensureEventList(data?.projects);
    },

    query_active_history_completed(
      this: State,
      { active_history } = { active_history: {} },
      request_nonce?: number
    ) {
      if (typeof request_nonce === 'number' && request_nonce !== this.active_request_nonce) return;
      this.active.history = {
        ...this.active.history,
        ...ensureActiveHistory(active_history),
      };
    },

    query_category_time_by_period_completed(
      this: State,
      { by_period } = { by_period: {} },
      request_nonce?: number
    ) {
      if (typeof request_nonce === 'number' && request_nonce !== this.active_request_nonce) return;
      this.category.by_period = ensureByPeriod(by_period);
      console.log('ACTIVITY STORE: query_category_time_by_period_completed committed by_period');
    },
  },
});
