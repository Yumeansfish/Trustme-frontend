import { defineStore } from 'pinia';
import moment from 'moment';
import * as _ from 'lodash';
import { map, filter, values, groupBy, sortBy, flow, reverse } from 'lodash/fp';
import { IBucket, IEvent } from '~/shared/lib/interfaces';

import { window_events } from '~/features/activity/lib/fakedata';
import queries, { browser_appname_regex } from '~/app/lib/queries';
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
import { expandHostsToEffectiveGroup } from '~/features/settings/lib/deviceMappings';
import { useBucketsStore } from '~/features/buckets/store/buckets';
import { useCategoryStore } from '~/features/categorization/store/categories';
import { getColorFromString } from '~/features/categorization/lib/color';
import {
  compileQueryCategoryRules,
  matchCompiledCategoryNameAgainstTexts,
  serializeQueryCategoryRules,
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

function buildExecutionQueryPeriods(timeperiod: TimePeriod): string[] {
  const period = timeperiodToStr(timeperiod);
  const [startIso, endIso] = period.split('/');
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return [period];
  }

  const nowMs = Date.now();
  if (startMs >= nowMs) {
    return [];
  }

  if (endMs <= nowMs) {
    return [period];
  }

  return [`${startIso}/${new Date(nowMs).toISOString()}`];
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
const EVENT_FETCH_CACHE_LIVE_TTL_MS = 20_000;
const EVENT_FETCH_CACHE_HISTORICAL_TTL_MS = 300_000;
const ACTIVITY_RESULT_CACHE_LIVE_TTL_MS = 30_000;
const ACTIVITY_RESULT_CACHE_HISTORICAL_TTL_MS = 15 * 60 * 1000;
const ACTIVITY_RESULT_CACHE_SCHEMA_VERSION = 4;
const ACTIVITY_RESULT_CACHE_STORAGE_KEY = `aw-webui.activity-result-cache.v${ACTIVITY_RESULT_CACHE_SCHEMA_VERSION}`;
const ACTIVITY_SUMMARY_SNAPSHOT_STORAGE_KEY = `aw-webui.activity-summary-snapshot-cache.v${ACTIVITY_RESULT_CACHE_SCHEMA_VERSION}`;
const ACTIVITY_RESULT_CACHE_STORAGE_MAX_ENTRIES = 24;
const ACTIVITY_RESULT_CACHE_INDEXED_DB_NAME = `aw-webui.activity-cache.v${ACTIVITY_RESULT_CACHE_SCHEMA_VERSION}`;
const ACTIVITY_RESULT_CACHE_INDEXED_DB_STORE = 'activity-results';
const ACTIVITY_RESULT_CACHE_INDEXED_DB_VERSION = ACTIVITY_RESULT_CACHE_SCHEMA_VERSION;
const BROWSER_SERVER_SUMMARY_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;
const BROWSER_DIRECT_BUCKET_THRESHOLD_MS = 0;
const APP_VISUALIZATIONS = new Set(['top_apps']);
const EDITOR_VISUALIZATIONS = new Set([
  'top_editor_files',
  'top_editor_languages',
  'top_editor_projects',
]);
const WINDOW_VISUALIZATIONS = new Set([
  ...APP_VISUALIZATIONS,
  'top_titles',
  'top_categories',
  'category_donut',
  'category_tree',
  'category_sunburst',
  'score',
  'timeline_barchart',
]);
const CATEGORY_PERIOD_VISUALIZATIONS = new Set(['timeline_barchart']);
const CATEGORY_TOP_VISUALIZATIONS = new Set([
  'top_categories',
  'category_donut',
  'category_tree',
  'category_sunburst',
  'score',
]);
const COMPACT_WINDOW_SUMMARY_VISUALIZATIONS = new Set([
  ...APP_VISUALIZATIONS,
  ...CATEGORY_TOP_VISUALIZATIONS,
  ...CATEGORY_PERIOD_VISUALIZATIONS,
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

interface CompactSummaryQueryResult {
  events?: IEvent[] | null;
  manual_events?: IEvent[] | null;
  active_duration?: number | null;
}

interface DashboardSummarySnapshotResult {
  window: WindowQueryResult;
  by_period: CategoryPeriodData;
}

interface CompactSummarySnapshotSegment {
  logicalPeriod: string;
  queryPeriod: string;
  result: CompactSummaryQueryResult;
}

interface ActivityResultCacheMeta {
  compactSummarySegments?: CompactSummarySnapshotSegment[];
}

interface NumericInterval {
  startMs: number;
  endMs: number;
}

interface ExecutionRange {
  start: Date;
  end: Date;
  period: string;
}

interface EventFetchCacheEntry {
  createdAt: number;
  promise: Promise<IEvent[]>;
}

interface ActivityResultCacheSnapshot {
  windowTopApps: MaybeLoadedList<IEvent>;
  windowTopTitles: MaybeLoadedList<IEvent>;
  browserDuration: number;
  browserTopUrls: MaybeLoadedList<IEvent>;
  browserTopDomains: MaybeLoadedList<IEvent>;
  browserTopTitles: MaybeLoadedList<IEvent>;
  editorDuration: number;
  editorTopFiles: MaybeLoadedList<IEvent>;
  editorTopProjects: MaybeLoadedList<IEvent>;
  editorTopLanguages: MaybeLoadedList<IEvent>;
  categoryTop: MaybeLoadedList<IEvent>;
  categoryByPeriod: CategoryPeriodData | null;
  activeDuration: number | null;
  activeEvents: MaybeLoadedList<IEvent>;
  stopwatchTop: IEvent[];
}

interface ActivityResultCacheEntry {
  createdAt: number;
  snapshot: ActivityResultCacheSnapshot;
  meta?: ActivityResultCacheMeta;
}

interface PersistedActivityResultCacheEntry extends ActivityResultCacheEntry {
  key: string;
}

interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

const eventTimingCache = new WeakMap<IEvent, { startMs: number; endMs: number }>();
const eventFetchCache = new Map<string, EventFetchCacheEntry>();
const activityResultCache = new Map<string, ActivityResultCacheEntry>();
const historicalSummarySnapshotCache = new Map<string, ActivityResultCacheEntry>();
const activityResultInflightCache = new Map<string, Promise<void>>();
const compiledCategoryRulesCache = new Map<string, ReturnType<typeof compileQueryCategoryRules>>();
const categoryMatchCache = new Map<string, string[]>();
let activityResultCacheHydrated = false;
let historicalSummarySnapshotCacheHydrated = false;
let activityResultCacheIndexedDbPromise: Promise<IDBDatabase | null> | null = null;
let activityResultCacheIndexedDbPrunePromise: Promise<void> | null = null;
let dashboardSummarySnapshotEndpointState: 'unknown' | 'available' | 'unavailable' = 'unknown';

function createDeferredPromise<T>(): DeferredPromise<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function withIndexedDbStoreTransaction<T>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T> | T
): Promise<T | null> {
  return openActivityResultCacheIndexedDb().then(async database => {
    if (!database) {
      return null;
    }

    const transaction = database.transaction(ACTIVITY_RESULT_CACHE_INDEXED_DB_STORE, mode);
    const store = transaction.objectStore(ACTIVITY_RESULT_CACHE_INDEXED_DB_STORE);

    const completion = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    const result = await executor(store, transaction);
    await completion;
    return result;
  });
}

function indexedDbRequestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openActivityResultCacheIndexedDb(): Promise<IDBDatabase | null> {
  if (activityResultCacheIndexedDbPromise) {
    return activityResultCacheIndexedDbPromise;
  }

  if (typeof globalThis.indexedDB === 'undefined') {
    activityResultCacheIndexedDbPromise = Promise.resolve(null);
    return activityResultCacheIndexedDbPromise;
  }

  activityResultCacheIndexedDbPromise = new Promise(resolve => {
    try {
      const request = globalThis.indexedDB.open(
        ACTIVITY_RESULT_CACHE_INDEXED_DB_NAME,
        ACTIVITY_RESULT_CACHE_INDEXED_DB_VERSION
      );

      request.onupgradeneeded = () => {
        const database = request.result;
        const store = database.objectStoreNames.contains(ACTIVITY_RESULT_CACHE_INDEXED_DB_STORE)
          ? request.transaction?.objectStore(ACTIVITY_RESULT_CACHE_INDEXED_DB_STORE)
          : database.createObjectStore(ACTIVITY_RESULT_CACHE_INDEXED_DB_STORE, { keyPath: 'key' });

        if (store && !store.indexNames.contains('createdAt')) {
          store.createIndex('createdAt', 'createdAt');
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          activityResultCacheIndexedDbPromise = null;
        };
        resolve(database);
      };

      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return activityResultCacheIndexedDbPromise;
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

function getCategoryMatchingContext(rules: QueryCategoryRule[]) {
  const signature = serializeQueryCategoryRules(rules);
  let compiledRules = compiledCategoryRulesCache.get(signature);

  if (!compiledRules) {
    compiledRules = compileQueryCategoryRules(rules);
    compiledCategoryRulesCache.set(signature, compiledRules);
  }

  return { signature, compiledRules };
}

function resolveCategoryForEventData(
  data: Record<string, unknown>,
  matchingContext: ReturnType<typeof getCategoryMatchingContext>
): string[] {
  const manualCategory = manualAwayCategoryFromData(data);
  if (manualCategory) {
    return manualCategory;
  }

  const app = typeof data.app === 'string' ? data.app : '';
  const title = typeof data.title === 'string' ? data.title : '';
  const cacheKey = `${matchingContext.signature}\u0000${app}\u0000${title}`;
  const cachedCategory = categoryMatchCache.get(cacheKey);
  if (cachedCategory) {
    return cachedCategory;
  }

  const matchedCategory =
    matchCompiledCategoryNameAgainstTexts([app, title], matchingContext.compiledRules) || [
      ...UNCATEGORIZED_CATEGORY_NAME,
    ];

  categoryMatchCache.set(cacheKey, matchedCategory);
  return matchedCategory;
}

function categorizeEventsLocally(events: IEvent[], queryRules: QueryCategoryRule[]): IEvent[] {
  const matchingContext = getCategoryMatchingContext(queryRules);

  return events.map(event => {
    const data = event.data || {};
    const matchedCategoryName = resolveCategoryForEventData(data, matchingContext);

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
    const startMs = eventStartMs(event);
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

function parseExecutionRange(periods: string[]): ExecutionRange | null {
  if (periods.length === 0) {
    return null;
  }

  let earliestStart: Date | null = null;
  let latestEnd: Date | null = null;

  for (const period of periods) {
    const [startIso, endIso] = period.split('/');
    const start = new Date(startIso);
    const end = new Date(endIso);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      continue;
    }

    if (!earliestStart || start < earliestStart) {
      earliestStart = start;
    }

    if (!latestEnd || end > latestEnd) {
      latestEnd = end;
    }
  }

  if (!earliestStart || !latestEnd || latestEnd <= earliestStart) {
    return null;
  }

  return {
    start: earliestStart,
    end: latestEnd,
    period: `${earliestStart.toISOString()}/${latestEnd.toISOString()}`,
  };
}

function sortEventsByTimestamp(events: IEvent[]): IEvent[] {
  return [...events].sort((a, b) => eventStartMs(a) - eventStartMs(b));
}

function getEventTiming(event: IEvent): { startMs: number; endMs: number } {
  const cachedTiming = eventTimingCache.get(event);
  if (cachedTiming) {
    return cachedTiming;
  }

  const startMs = new Date(event.timestamp).getTime();
  const timing = {
    startMs,
    endMs: startMs + ensureDuration(event.duration) * 1000,
  };
  eventTimingCache.set(event, timing);
  return timing;
}

function eventToInterval(event: IEvent): NumericInterval | null {
  const startMs = eventStartMs(event);
  const endMs = eventEndMs(event);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }
  return { startMs, endMs };
}

function mergeIntervals(intervals: NumericInterval[]): NumericInterval[] {
  const sorted = intervals
    .filter(interval => Number.isFinite(interval.startMs) && Number.isFinite(interval.endMs))
    .filter(interval => interval.endMs > interval.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  const merged: NumericInterval[] = [];
  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.startMs > previous.endMs) {
      merged.push({ ...interval });
    } else {
      previous.endMs = Math.max(previous.endMs, interval.endMs);
    }
  }

  return merged;
}

function createEventSlice(event: IEvent, startMs: number, endMs: number): IEvent | null {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }

  return {
    ...event,
    timestamp: new Date(startMs).toISOString(),
    duration: (endMs - startMs) / 1000,
    data: {
      ...(event.data || {}),
    },
  };
}

function intersectEventsWithIntervals(events: IEvent[], intervals: NumericInterval[]): IEvent[] {
  const mergedIntervals = mergeIntervals(intervals);
  if (mergedIntervals.length === 0) {
    return [];
  }

  const sortedEvents = sortEventsByTimestamp(events);
  const results: IEvent[] = [];
  let intervalIndex = 0;

  for (const event of sortedEvents) {
    const eventStart = eventStartMs(event);
    const eventEnd = eventEndMs(event);
    if (!Number.isFinite(eventStart) || !Number.isFinite(eventEnd) || eventEnd <= eventStart) {
      continue;
    }

    while (
      intervalIndex < mergedIntervals.length &&
      mergedIntervals[intervalIndex].endMs <= eventStart
    ) {
      intervalIndex += 1;
    }

    let index = intervalIndex;
    while (index < mergedIntervals.length) {
      const interval = mergedIntervals[index];
      if (interval.startMs >= eventEnd) {
        break;
      }

      const overlapStart = Math.max(eventStart, interval.startMs);
      const overlapEnd = Math.min(eventEnd, interval.endMs);
      const sliced = createEventSlice(event, overlapStart, overlapEnd);
      if (sliced) {
        results.push(sliced);
      }

      if (interval.endMs >= eventEnd) {
        break;
      }
      index += 1;
    }
  }

  return results;
}

function subtractIntervalsFromEvents(events: IEvent[], blockedIntervals: NumericInterval[]): IEvent[] {
  const mergedBlocked = mergeIntervals(blockedIntervals);
  if (mergedBlocked.length === 0) {
    return sortEventsByTimestamp(events);
  }

  const sortedEvents = sortEventsByTimestamp(events);
  const results: IEvent[] = [];
  let blockedIndex = 0;

  for (const event of sortedEvents) {
    const eventStart = eventStartMs(event);
    const eventEnd = eventEndMs(event);
    if (!Number.isFinite(eventStart) || !Number.isFinite(eventEnd) || eventEnd <= eventStart) {
      continue;
    }

    while (blockedIndex < mergedBlocked.length && mergedBlocked[blockedIndex].endMs <= eventStart) {
      blockedIndex += 1;
    }

    let cursor = eventStart;
    let index = blockedIndex;
    while (index < mergedBlocked.length) {
      const blocked = mergedBlocked[index];
      if (blocked.startMs >= eventEnd) {
        break;
      }

      if (blocked.startMs > cursor) {
        const sliced = createEventSlice(event, cursor, Math.min(blocked.startMs, eventEnd));
        if (sliced) {
          results.push(sliced);
        }
      }

      cursor = Math.max(cursor, blocked.endMs);
      if (cursor >= eventEnd) {
        break;
      }
      index += 1;
    }

    if (cursor < eventEnd) {
      const sliced = createEventSlice(event, cursor, eventEnd);
      if (sliced) {
        results.push(sliced);
      }
    }
  }

  return results;
}

function subtractIntervalsFromIntervals(
  baseIntervals: NumericInterval[],
  blockedIntervals: NumericInterval[]
): NumericInterval[] {
  const mergedBase = mergeIntervals(baseIntervals);
  if (mergedBase.length === 0) {
    return [];
  }

  const mergedBlocked = mergeIntervals(blockedIntervals);
  if (mergedBlocked.length === 0) {
    return mergedBase;
  }

  const results: NumericInterval[] = [];
  let blockedIndex = 0;

  for (const base of mergedBase) {
    while (blockedIndex < mergedBlocked.length && mergedBlocked[blockedIndex].endMs <= base.startMs) {
      blockedIndex += 1;
    }

    let cursor = base.startMs;
    let index = blockedIndex;

    while (index < mergedBlocked.length) {
      const blocked = mergedBlocked[index];
      if (blocked.startMs >= base.endMs) {
        break;
      }

      if (blocked.startMs > cursor) {
        results.push({
          startMs: cursor,
          endMs: Math.min(blocked.startMs, base.endMs),
        });
      }

      cursor = Math.max(cursor, blocked.endMs);
      if (cursor >= base.endMs) {
        break;
      }
      index += 1;
    }

    if (cursor < base.endMs) {
      results.push({
        startMs: cursor,
        endMs: base.endMs,
      });
    }
  }

  return results;
}

function intervalsToEvents(intervals: NumericInterval[], data: Record<string, unknown>): IEvent[] {
  return mergeIntervals(intervals).map(interval => ({
    timestamp: new Date(interval.startMs).toISOString(),
    duration: (interval.endMs - interval.startMs) / 1000,
    data: { ...data },
  }));
}

function buildBrowserBucketRegex(bucketId: string): RegExp | null {
  const browserKey = Object.keys(browser_appname_regex).find(key => bucketId.includes(key));
  if (!browserKey) {
    return null;
  }

  try {
    return new RegExp(browser_appname_regex[browserKey].replace(/^\(\?i\)/, ''), 'i');
  } catch {
    return null;
  }
}

function buildBrowserFocusIntervals(windowEvents: IEvent[], browserBucketIds: string[]): NumericInterval[] {
  const regexes = browserBucketIds
    .map(buildBrowserBucketRegex)
    .filter((regex): regex is RegExp => regex instanceof RegExp);
  if (regexes.length === 0) {
    return [];
  }

  const intervals = windowEvents
    .filter(event => {
      const app = typeof event.data?.app === 'string' ? event.data.app : '';
      return regexes.some(regex => regex.test(app));
    })
    .map(eventToInterval)
    .filter((interval): interval is NumericInterval => interval !== null);

  return mergeIntervals(intervals);
}

function buildActiveIntervals(
  afkEvents: IEvent[],
  windowEvents: IEvent[],
  alwaysActivePattern?: string
): NumericInterval[] {
  const baseIntervals = afkEvents
    .filter(event => event.data?.status === 'not-afk')
    .map(eventToInterval)
    .filter((interval): interval is NumericInterval => interval !== null);

  if (!alwaysActivePattern) {
    return mergeIntervals(baseIntervals);
  }

  try {
    const regex = new RegExp(alwaysActivePattern);
    const forcedIntervals = windowEvents
      .filter(event => {
        const app = typeof event.data?.app === 'string' ? event.data.app : '';
        const title = typeof event.data?.title === 'string' ? event.data.title : '';
        return regex.test(app) || regex.test(title);
      })
      .map(eventToInterval)
      .filter((interval): interval is NumericInterval => interval !== null);

    return mergeIntervals([...baseIntervals, ...forcedIntervals]);
  } catch {
    return mergeIntervals(baseIntervals);
  }
}

function withBrowserDomains(events: IEvent[]): IEvent[] {
  return events.map(event => {
    const url = typeof event.data?.url === 'string' ? event.data.url : '';
    let domain = '';
    if (url) {
      try {
        domain = new URL(url).host;
      } catch {
        domain = '';
      }
    }

    return {
      ...event,
      data: {
        ...(event.data || {}),
        $domain: domain,
      },
    };
  });
}

function buildEventFetchCacheKey(bucketIds: string[], range: ExecutionRange): string {
  return JSON.stringify({
    buckets: [...bucketIds].sort(),
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
}

function getEventFetchCacheTtl(range: ExecutionRange): number {
  return range.end.getTime() >= Date.now() - 5 * 60 * 1000
    ? EVENT_FETCH_CACHE_LIVE_TTL_MS
    : EVENT_FETCH_CACHE_HISTORICAL_TTL_MS;
}

function clearEventFetchCache() {
  eventFetchCache.clear();
}

function clearActivityResultCache() {
  activityResultCache.clear();
  historicalSummarySnapshotCache.clear();
  activityResultInflightCache.clear();
  try {
    globalThis.sessionStorage?.removeItem(ACTIVITY_RESULT_CACHE_STORAGE_KEY);
  } catch {
    // Ignore storage access errors in private/sandboxed contexts.
  }
  try {
    globalThis.localStorage?.removeItem(ACTIVITY_SUMMARY_SNAPSHOT_STORAGE_KEY);
  } catch {
    // Ignore storage access errors in private/sandboxed contexts.
  }
  void clearPersistedActivityResultCache();
}

function pruneExpiredEventFetchCache() {
  const now = Date.now();
  for (const [key, entry] of eventFetchCache.entries()) {
    if (now - entry.createdAt > EVENT_FETCH_CACHE_HISTORICAL_TTL_MS) {
      eventFetchCache.delete(key);
    }
  }
}

function pruneExpiredActivityResultCache() {
  const now = Date.now();
  for (const [key, entry] of activityResultCache.entries()) {
    if (now - entry.createdAt > ACTIVITY_RESULT_CACHE_HISTORICAL_TTL_MS) {
      activityResultCache.delete(key);
    }
  }
  void prunePersistedActivityResultCache();
}

function persistActivityResultCache() {
  try {
    const storage = globalThis.sessionStorage;
    if (!storage) {
      return;
    }

    const serializedEntries = [...activityResultCache.entries()]
      .sort(([, left], [, right]) => right.createdAt - left.createdAt)
      .slice(0, ACTIVITY_RESULT_CACHE_STORAGE_MAX_ENTRIES)
      .map(([key, entry]) => ({
        key,
        createdAt: entry.createdAt,
        snapshot: entry.snapshot,
        meta: entry.meta,
      }));

    storage.setItem(ACTIVITY_RESULT_CACHE_STORAGE_KEY, JSON.stringify(serializedEntries));
  } catch {
    // Ignore storage quota / access errors.
  }
}

function persistHistoricalSummarySnapshotCache() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) {
      return;
    }

    const serializedEntries = [...historicalSummarySnapshotCache.entries()]
      .sort(([, left], [, right]) => right.createdAt - left.createdAt)
      .slice(0, ACTIVITY_RESULT_CACHE_STORAGE_MAX_ENTRIES)
      .map(([key, entry]) => ({
        key,
        createdAt: entry.createdAt,
        snapshot: entry.snapshot,
        meta: entry.meta,
      }));

    storage.setItem(ACTIVITY_SUMMARY_SNAPSHOT_STORAGE_KEY, JSON.stringify(serializedEntries));
  } catch {
    // Ignore storage quota / access errors.
  }
}

function hydrateActivityResultCache() {
  if (activityResultCacheHydrated) {
    return;
  }
  activityResultCacheHydrated = true;

  try {
    const storage = globalThis.sessionStorage;
    if (!storage) {
      return;
    }

    const raw = storage.getItem(ACTIVITY_RESULT_CACHE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return;
    }

    for (const item of parsed) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.key !== 'string' ||
        typeof item.createdAt !== 'number' ||
        !item.snapshot ||
        typeof item.snapshot !== 'object'
      ) {
        continue;
      }

      activityResultCache.set(item.key, {
        createdAt: item.createdAt,
        snapshot: item.snapshot as ActivityResultCacheSnapshot,
        meta:
          item.meta && typeof item.meta === 'object'
            ? (item.meta as ActivityResultCacheMeta)
            : undefined,
      });
    }

    pruneExpiredActivityResultCache();
    persistActivityResultCache();
  } catch {
    // Ignore malformed session cache.
  }
}

function hydrateHistoricalSummarySnapshotCache() {
  if (historicalSummarySnapshotCacheHydrated) {
    return;
  }
  historicalSummarySnapshotCacheHydrated = true;

  try {
    const storage = globalThis.localStorage;
    if (!storage) {
      return;
    }

    const raw = storage.getItem(ACTIVITY_SUMMARY_SNAPSHOT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return;
    }

    for (const item of parsed) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.key !== 'string' ||
        typeof item.createdAt !== 'number' ||
        !item.snapshot ||
        typeof item.snapshot !== 'object'
      ) {
        continue;
      }

      historicalSummarySnapshotCache.set(item.key, {
        createdAt: item.createdAt,
        snapshot: item.snapshot as ActivityResultCacheSnapshot,
        meta:
          item.meta && typeof item.meta === 'object'
            ? (item.meta as ActivityResultCacheMeta)
            : undefined,
      });
    }

    persistHistoricalSummarySnapshotCache();
  } catch {
    // Ignore malformed local cache.
  }
}

async function clearPersistedActivityResultCache() {
  await withIndexedDbStoreTransaction('readwrite', store => {
    store.clear();
  });
}

async function deletePersistedActivityResultCacheEntry(key: string) {
  await withIndexedDbStoreTransaction('readwrite', store => {
    store.delete(key);
  });
}

async function persistActivityResultCacheEntry(
  key: string,
  entry: ActivityResultCacheEntry
): Promise<void> {
  await withIndexedDbStoreTransaction('readwrite', store => {
    store.put({
      key,
      createdAt: entry.createdAt,
      snapshot: entry.snapshot,
      meta: entry.meta,
    } satisfies PersistedActivityResultCacheEntry);
  });
  void prunePersistedActivityResultCache();
}

async function readPersistedActivityResultCacheEntry(
  key: string
): Promise<ActivityResultCacheEntry | null> {
  const record = await withIndexedDbStoreTransaction('readonly', async store => {
    const request = store.get(key);
    const result = await indexedDbRequestToPromise(request);
    return result as PersistedActivityResultCacheEntry | undefined;
  });

  if (!record || typeof record !== 'object') {
    return null;
  }

  if (
    typeof (record as PersistedActivityResultCacheEntry).createdAt !== 'number' ||
    !(record as PersistedActivityResultCacheEntry).snapshot ||
    typeof (record as PersistedActivityResultCacheEntry).snapshot !== 'object'
  ) {
    return null;
  }

  return {
    createdAt: (record as PersistedActivityResultCacheEntry).createdAt,
    snapshot: (record as PersistedActivityResultCacheEntry).snapshot,
    meta:
      (record as PersistedActivityResultCacheEntry).meta &&
      typeof (record as PersistedActivityResultCacheEntry).meta === 'object'
        ? ((record as PersistedActivityResultCacheEntry).meta as ActivityResultCacheMeta)
        : undefined,
  };
}

async function prunePersistedActivityResultCache() {
  if (activityResultCacheIndexedDbPrunePromise) {
    return activityResultCacheIndexedDbPrunePromise;
  }

  activityResultCacheIndexedDbPrunePromise = withIndexedDbStoreTransaction(
    'readwrite',
    async (store, transaction) => {
      const index = store.index('createdAt');
      const remaining = (await indexedDbRequestToPromise(
        index.getAll()
      )) as PersistedActivityResultCacheEntry[];

      if (remaining.length > ACTIVITY_RESULT_CACHE_STORAGE_MAX_ENTRIES) {
        remaining
          .sort((left, right) => right.createdAt - left.createdAt)
          .slice(ACTIVITY_RESULT_CACHE_STORAGE_MAX_ENTRIES)
          .forEach(record => {
            if (record?.key) {
              store.delete(record.key);
            }
          });
      }
    }
  )
    .then(() => undefined)
    .finally(() => {
      activityResultCacheIndexedDbPrunePromise = null;
    });

  return activityResultCacheIndexedDbPrunePromise;
}

async function fetchEventsFromBuckets(
  bucketIds: string[],
  range: ExecutionRange,
  { useCache = true }: { useCache?: boolean } = {}
): Promise<IEvent[]> {
  const uniqueBucketIds = _.uniq(bucketIds.filter(Boolean));
  if (uniqueBucketIds.length === 0) {
    return [];
  }

  const fetchFreshEvents = async () => {
    if (uniqueBucketIds.length === 1) {
      return ensureEventList(
        await getClient().getEvents(uniqueBucketIds[0], {
          start: range.start,
          end: range.end,
          limit: -1,
        })
      );
    }

    const eventLists = await Promise.all(
      uniqueBucketIds.map(bucketId =>
        getClient().getEvents(bucketId, {
          start: range.start,
          end: range.end,
          limit: -1,
        })
      )
    );

    return sortEventsByTimestamp(eventLists.flatMap(events => ensureEventList(events)));
  };

  if (useCache) {
    pruneExpiredEventFetchCache();
    const cacheKey = buildEventFetchCacheKey(uniqueBucketIds, range);
    const cacheTtl = getEventFetchCacheTtl(range);
    const cachedEntry = eventFetchCache.get(cacheKey);

    if (cachedEntry && Date.now() - cachedEntry.createdAt <= cacheTtl) {
      return cachedEntry.promise;
    }

    const promise = fetchFreshEvents().catch(error => {
      eventFetchCache.delete(cacheKey);
      throw error;
    });

    eventFetchCache.set(cacheKey, {
      createdAt: Date.now(),
      promise,
    });

    return promise;
  }

  return fetchFreshEvents();
}

async function fetchCompletedStopwatchEvents(
  bucketIds: string[],
  range: ExecutionRange,
  options?: { useCache?: boolean }
): Promise<IEvent[]> {
  const stopwatchEvents = await fetchEventsFromBuckets(bucketIds, range, options);
  return stopwatchEvents.filter(event => event.data?.running === false);
}

async function fetchDashboardSummarySnapshot({
  range,
  categoryPeriods,
  windowBucketIds,
  afkBucketIds,
  stopwatchBucketIds,
  filterAfk,
  categories,
  filterCategories,
  alwaysActivePattern,
}: {
  range: ExecutionRange | null;
  categoryPeriods: string[];
  windowBucketIds: string[];
  afkBucketIds: string[];
  stopwatchBucketIds: string[];
  filterAfk: boolean | undefined;
  categories: QueryCategoryRule[];
  filterCategories: string[][] | undefined;
  alwaysActivePattern: string | undefined;
}): Promise<DashboardSummarySnapshotResult | null> {
  if (
    !range ||
    categoryPeriods.length === 0 ||
    windowBucketIds.length === 0 ||
    afkBucketIds.length === 0 ||
    dashboardSummarySnapshotEndpointState === 'unavailable'
  ) {
    return null;
  }

  try {
    const response = await getClient().req.post('/0/dashboard/summary-snapshot', {
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      category_periods: categoryPeriods,
      window_buckets: _.uniq(windowBucketIds),
      afk_buckets: _.uniq(afkBucketIds),
      stopwatch_buckets: _.uniq(stopwatchBucketIds),
      filter_afk: Boolean(filterAfk),
      categories,
      filter_categories: filterCategories || [],
      always_active_pattern: alwaysActivePattern || '',
    });

    dashboardSummarySnapshotEndpointState = 'available';

    return {
      window: {
        app_events: ensureEventList(response.data?.window?.app_events),
        title_events: ensureEventList(response.data?.window?.title_events),
        cat_events: ensureEventList(response.data?.window?.cat_events),
        active_events: ensureEventList(response.data?.window?.active_events),
        duration: ensureDuration(response.data?.window?.duration),
      },
      by_period: ensureByPeriod(response.data?.by_period),
    };
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404 || status === 405 || status === 501) {
      dashboardSummarySnapshotEndpointState = 'unavailable';
    }
    console.warn('Dashboard summary snapshot endpoint unavailable, falling back', error);
    return null;
  }
}

function aggregateBrowserEventsLocally(events: IEvent[]): BrowserQueryResult {
  return {
    domains: aggregateEventsByDataKeys(filterEventsByNonEmptyStringData(events, '$domain'), [
      '$domain',
    ]),
    urls: aggregateEventsByDataKeys(filterEventsByNonEmptyStringData(events, 'url'), ['url']),
    titles: aggregateEventsByDataKeys(filterEventsByNonEmptyStringData(events, 'title'), ['title']),
    duration: sumEventDurations(events),
  };
}

function combineBrowserPeriodSummaries(
  results: Array<BrowserQueryResult | undefined>
): BrowserQueryResult {
  const domains = results.flatMap(result => ensureEventList(result?.domains));
  const urls = results.flatMap(result => ensureEventList(result?.urls));
  const titles = results.flatMap(result => ensureEventList(result?.titles));
  const duration = results.reduce((total, result) => total + ensureDuration(result?.duration), 0);

  return {
    domains: aggregateEventsByDataKeys(domains, ['$domain']),
    urls: aggregateEventsByDataKeys(urls, ['url']),
    titles: aggregateEventsByDataKeys(titles, ['title']),
    duration,
  };
}

function buildCompactSummaryWindowData(
  periods: string[],
  data: Array<CompactSummaryQueryResult | undefined>,
  categories: QueryCategoryRule[],
  filterCategories?: string[][]
): {
  window: WindowQueryResult;
  by_period: CategoryPeriodData;
} {
  const matchingContext = getCategoryMatchingContext(categories);
  const allowedCategories =
    Array.isArray(filterCategories) && filterCategories.length > 0
      ? new Set(filterCategories.map(category => JSON.stringify(category)))
      : null;
  const appDurations = new Map<string, { duration: number; timestampMs: number }>();
  const categoryDurations = new Map<string, { category: string[]; duration: number; timestampMs: number }>();
  const by_period: CategoryPeriodData = {};
  let activeDuration = 0;
  let fallbackDuration = 0;

  periods.forEach((period, index) => {
    const result = data?.[index];
    activeDuration += ensureDuration(result?.active_duration);

    const manualEvents = ensureEventList(result?.manual_events).map(event => ({
      ...event,
      data: {
        ...(event.data || {}),
        $manual_away: true,
      },
    }));
    const sourceEvents = [...ensureEventList(result?.events), ...manualEvents];
    const periodCategoryDurations = new Map<
      string,
      { category: string[]; duration: number; timestampMs: number }
    >();

    for (const event of sourceEvents) {
      const duration = ensureDuration(event.duration);
      if (duration <= 0) {
        continue;
      }
      const data = event.data || {};
      const category = resolveCategoryForEventData(data, matchingContext);
      const categoryKey = JSON.stringify(category);

      if (allowedCategories && !allowedCategories.has(categoryKey)) {
        continue;
      }

      fallbackDuration += duration;

      const timestampMs = eventStartMs(event);
      const existingCategory = categoryDurations.get(categoryKey);
      if (existingCategory) {
        existingCategory.duration += duration;
        existingCategory.timestampMs = Math.min(existingCategory.timestampMs, timestampMs);
      } else {
        categoryDurations.set(categoryKey, {
          category,
          duration,
          timestampMs,
        });
      }

      const existingPeriodCategory = periodCategoryDurations.get(categoryKey);
      if (existingPeriodCategory) {
        existingPeriodCategory.duration += duration;
        existingPeriodCategory.timestampMs = Math.min(existingPeriodCategory.timestampMs, timestampMs);
      } else {
        periodCategoryDurations.set(categoryKey, {
          category,
          duration,
          timestampMs,
        });
      }

      const app = typeof data.app === 'string' ? data.app.trim() : '';
      if (app.length > 0) {
        const existingApp = appDurations.get(app);
        if (existingApp) {
          existingApp.duration += duration;
          existingApp.timestampMs = Math.min(existingApp.timestampMs, timestampMs);
        } else {
          appDurations.set(app, {
            duration,
            timestampMs,
          });
        }
      }
    }

    by_period[period] = {
      cat_events: [...periodCategoryDurations.values()]
        .sort((left, right) => right.duration - left.duration)
        .map(entry => ({
          timestamp: new Date(entry.timestampMs).toISOString(),
          duration: entry.duration,
          data: { $category: entry.category },
        })),
    };
  });

  const app_events = [...appDurations.entries()]
    .sort(([, left], [, right]) => right.duration - left.duration)
    .slice(0, LOCAL_AGGREGATION_LIMIT)
    .map(([app, entry]) => ({
      timestamp: new Date(entry.timestampMs).toISOString(),
      duration: entry.duration,
      data: { app },
    }));

  const cat_events = [...categoryDurations.values()]
    .sort((left, right) => right.duration - left.duration)
    .slice(0, LOCAL_AGGREGATION_LIMIT)
    .map(entry => ({
      timestamp: new Date(entry.timestampMs).toISOString(),
      duration: entry.duration,
      data: { $category: entry.category },
    }));

  const duration = activeDuration > 0 ? activeDuration : fallbackDuration;

  return {
    window: {
      app_events,
      title_events: [],
      cat_events,
      active_events: [],
      duration,
    },
    by_period,
  };
}

function buildCompactSummaryWindowDataFromEvents(
  events: IEvent[],
  categories: QueryCategoryRule[],
  filterCategories?: string[][],
  periods: string[] = []
): {
  window: WindowQueryResult;
  by_period: CategoryPeriodData;
} {
  const matchingContext = getCategoryMatchingContext(categories);
  const allowedCategories =
    Array.isArray(filterCategories) && filterCategories.length > 0
      ? new Set(filterCategories.map(category => JSON.stringify(category)))
      : null;
  const appDurations = new Map<string, { duration: number; timestampMs: number }>();
  const categoryDurations = new Map<string, { category: string[]; duration: number; timestampMs: number }>();
  const periodBounds = buildPeriodBounds(periods);
  const byPeriodMaps = periodBounds.map(
    () => new Map<string, { category: string[]; duration: number }>()
  );
  let totalDuration = 0;

  for (const event of events) {
    const duration = ensureDuration(event.duration);
    if (duration <= 0) {
      continue;
    }

    const data = event.data || {};
    const category = resolveCategoryForEventData(data, matchingContext);
    const categoryKey = JSON.stringify(category);

    if (allowedCategories && !allowedCategories.has(categoryKey)) {
      continue;
    }

    totalDuration += duration;

    const timestampMs = eventStartMs(event);
    const existingCategory = categoryDurations.get(categoryKey);
    if (existingCategory) {
      existingCategory.duration += duration;
      existingCategory.timestampMs = Math.min(existingCategory.timestampMs, timestampMs);
    } else {
      categoryDurations.set(categoryKey, {
        category,
        duration,
        timestampMs,
      });
    }

    const app = typeof data.app === 'string' ? data.app.trim() : '';
    if (app.length > 0) {
      const existingApp = appDurations.get(app);
      if (existingApp) {
        existingApp.duration += duration;
        existingApp.timestampMs = Math.min(existingApp.timestampMs, timestampMs);
      } else {
        appDurations.set(app, {
          duration,
          timestampMs,
        });
      }
    }

    if (periodBounds.length === 0) {
      continue;
    }

    const startMs = eventStartMs(event);
    const endMs = eventEndMs(event);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      continue;
    }

    let periodIndex = findFirstOverlappingPeriod(periodBounds, startMs);
    while (periodIndex < periodBounds.length && periodBounds[periodIndex].startMs < endMs) {
      const period = periodBounds[periodIndex];
      const overlapStart = Math.max(startMs, period.startMs);
      const overlapEnd = Math.min(endMs, period.endMs);

      if (overlapEnd > overlapStart) {
        const entry = byPeriodMaps[periodIndex].get(categoryKey);
        const overlapDuration = (overlapEnd - overlapStart) / 1000;
        if (entry) {
          entry.duration += overlapDuration;
        } else {
          byPeriodMaps[periodIndex].set(categoryKey, {
            category,
            duration: overlapDuration,
          });
        }
      }

      periodIndex += 1;
    }
  }

  const app_events = [...appDurations.entries()]
    .sort(([, left], [, right]) => right.duration - left.duration)
    .slice(0, LOCAL_AGGREGATION_LIMIT)
    .map(([app, entry]) => ({
      timestamp: new Date(entry.timestampMs).toISOString(),
      duration: entry.duration,
      data: { app },
    }));

  const cat_events = [...categoryDurations.values()]
    .sort((left, right) => right.duration - left.duration)
    .slice(0, LOCAL_AGGREGATION_LIMIT)
    .map(entry => ({
      timestamp: new Date(entry.timestampMs).toISOString(),
      duration: entry.duration,
      data: { $category: entry.category },
    }));

  const by_period: CategoryPeriodData = {};
  periodBounds.forEach((period, periodIndex) => {
    by_period[period.key] = {
      cat_events: [...byPeriodMaps[periodIndex].values()]
        .sort((left, right) => right.duration - left.duration)
        .map(entry => ({
          timestamp: new Date(period.startMs).toISOString(),
          duration: entry.duration,
          data: { $category: entry.category },
        })),
    };
  });

  periods.forEach(period => {
    if (!by_period[period]) {
      by_period[period] = { cat_events: [] };
    }
  });

  return {
    window: {
      app_events,
      title_events: [],
      cat_events,
      active_events: [],
      duration: totalDuration,
    },
    by_period,
  };
}

function accumulateCompactSummarySlice(
  startMs: number,
  endMs: number,
  data: Record<string, unknown>,
  matchingContext: ReturnType<typeof getCategoryMatchingContext>,
  allowedCategories: Set<string> | null,
  appDurations: Map<string, { duration: number; timestampMs: number }>,
  categoryDurations: Map<string, { category: string[]; duration: number; timestampMs: number }>,
  periodBounds: PeriodBound[],
  byPeriodMaps: Array<Map<string, { category: string[]; duration: number }>>
): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }

  const duration = (endMs - startMs) / 1000;
  if (duration <= 0) {
    return 0;
  }

  const category = resolveCategoryForEventData(data, matchingContext);
  const categoryKey = JSON.stringify(category);
  if (allowedCategories && !allowedCategories.has(categoryKey)) {
    return 0;
  }

  const timestampMs = startMs;
  const existingCategory = categoryDurations.get(categoryKey);
  if (existingCategory) {
    existingCategory.duration += duration;
    existingCategory.timestampMs = Math.min(existingCategory.timestampMs, timestampMs);
  } else {
    categoryDurations.set(categoryKey, {
      category,
      duration,
      timestampMs,
    });
  }

  const app = typeof data.app === 'string' ? data.app.trim() : '';
  if (app.length > 0) {
    const existingApp = appDurations.get(app);
    if (existingApp) {
      existingApp.duration += duration;
      existingApp.timestampMs = Math.min(existingApp.timestampMs, timestampMs);
    } else {
      appDurations.set(app, {
        duration,
        timestampMs,
      });
    }
  }

  if (periodBounds.length === 0) {
    return duration;
  }

  let periodIndex = findFirstOverlappingPeriod(periodBounds, startMs);
  while (periodIndex < periodBounds.length && periodBounds[periodIndex].startMs < endMs) {
    const period = periodBounds[periodIndex];
    const overlapStart = Math.max(startMs, period.startMs);
    const overlapEnd = Math.min(endMs, period.endMs);

    if (overlapEnd > overlapStart) {
      const entry = byPeriodMaps[periodIndex].get(categoryKey);
      const overlapDuration = (overlapEnd - overlapStart) / 1000;
      if (entry) {
        entry.duration += overlapDuration;
      } else {
        byPeriodMaps[periodIndex].set(categoryKey, {
          category,
          duration: overlapDuration,
        });
      }
    }

    periodIndex += 1;
  }

  return duration;
}

function buildCompactSummaryWindowDataFromSources(
  windowEvents: IEvent[],
  includedIntervals: NumericInterval[],
  manualEvents: IEvent[],
  categories: QueryCategoryRule[],
  filterCategories?: string[][],
  periods: string[] = []
): {
  window: WindowQueryResult;
  by_period: CategoryPeriodData;
} {
  const matchingContext = getCategoryMatchingContext(categories);
  const allowedCategories =
    Array.isArray(filterCategories) && filterCategories.length > 0
      ? new Set(filterCategories.map(category => JSON.stringify(category)))
      : null;
  const appDurations = new Map<string, { duration: number; timestampMs: number }>();
  const categoryDurations = new Map<string, { category: string[]; duration: number; timestampMs: number }>();
  const periodBounds = buildPeriodBounds(periods);
  const byPeriodMaps = periodBounds.map(
    () => new Map<string, { category: string[]; duration: number }>()
  );
  const visibleIntervals = mergeIntervals(includedIntervals);
  const sortedWindowEvents = sortEventsByTimestamp(windowEvents);
  let totalDuration = 0;
  let intervalIndex = 0;

  for (const event of sortedWindowEvents) {
    const eventStart = eventStartMs(event);
    const eventEnd = eventEndMs(event);
    if (!Number.isFinite(eventStart) || !Number.isFinite(eventEnd) || eventEnd <= eventStart) {
      continue;
    }

    while (intervalIndex < visibleIntervals.length && visibleIntervals[intervalIndex].endMs <= eventStart) {
      intervalIndex += 1;
    }

    let index = intervalIndex;
    while (index < visibleIntervals.length) {
      const interval = visibleIntervals[index];
      if (interval.startMs >= eventEnd) {
        break;
      }

      totalDuration += accumulateCompactSummarySlice(
        Math.max(eventStart, interval.startMs),
        Math.min(eventEnd, interval.endMs),
        event.data || {},
        matchingContext,
        allowedCategories,
        appDurations,
        categoryDurations,
        periodBounds,
        byPeriodMaps
      );

      if (interval.endMs >= eventEnd) {
        break;
      }
      index += 1;
    }
  }

  for (const event of manualEvents) {
    totalDuration += accumulateCompactSummarySlice(
      eventStartMs(event),
      eventEndMs(event),
      event.data || {},
      matchingContext,
      allowedCategories,
      appDurations,
      categoryDurations,
      periodBounds,
      byPeriodMaps
    );
  }

  const app_events = [...appDurations.entries()]
    .sort(([, left], [, right]) => right.duration - left.duration)
    .slice(0, LOCAL_AGGREGATION_LIMIT)
    .map(([app, entry]) => ({
      timestamp: new Date(entry.timestampMs).toISOString(),
      duration: entry.duration,
      data: { app },
    }));

  const cat_events = [...categoryDurations.values()]
    .sort((left, right) => right.duration - left.duration)
    .slice(0, LOCAL_AGGREGATION_LIMIT)
    .map(entry => ({
      timestamp: new Date(entry.timestampMs).toISOString(),
      duration: entry.duration,
      data: { $category: entry.category },
    }));

  const by_period: CategoryPeriodData = {};
  periodBounds.forEach((period, periodIndex) => {
    by_period[period.key] = {
      cat_events: [...byPeriodMaps[periodIndex].values()]
        .sort((left, right) => right.duration - left.duration)
        .map(entry => ({
          timestamp: new Date(period.startMs).toISOString(),
          duration: entry.duration,
          data: { $category: entry.category },
        })),
    };
  });

  periods.forEach(period => {
    if (!by_period[period]) {
      by_period[period] = { cat_events: [] };
    }
  });

  return {
    window: {
      app_events,
      title_events: [],
      cat_events,
      active_events: [],
      duration: totalDuration,
    },
    by_period,
  };
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

function buildCompactSummarySnapshotPeriods(timeperiod: TimePeriod): string[] {
  const nowMs = Date.now();

  return buildCategoryPeriods(timeperiod)
    .map(period => {
      const [startIso, endIso] = period.split('/');
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(endIso).getTime();

      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= nowMs) {
        return null;
      }

      const effectiveEndIso =
        endMs > nowMs ? new Date(nowMs).toISOString() : endIso;

      return `${startIso}/${effectiveEndIso}`;
    })
    .filter((period): period is string => Boolean(period));
}

function buildCompactSummaryLogicalPeriods(timeperiod: TimePeriod): string[] {
  const nowMs = Date.now();

  return buildCategoryPeriods(timeperiod).filter(period => {
    const [startIso, endIso] = period.split('/');
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    return Number.isFinite(startMs) && Number.isFinite(endMs) && startMs < nowMs;
  });
}

function buildCompactSummarySegments(
  timeperiod: TimePeriod,
  data: Array<CompactSummaryQueryResult | undefined>
): CompactSummarySnapshotSegment[] {
  const logicalPeriods = buildCompactSummaryLogicalPeriods(timeperiod);
  const queryPeriods = buildCompactSummarySnapshotPeriods(timeperiod);

  return logicalPeriods.map((logicalPeriod, index) => ({
    logicalPeriod,
    queryPeriod: queryPeriods[index],
    result: {
      events: ensureEventList(data[index]?.events),
      manual_events: ensureEventList(data[index]?.manual_events),
      active_duration: ensureDuration(data[index]?.active_duration),
    },
  }));
}

function buildCompactSummaryWindowDataFromSegments(
  timeperiod: TimePeriod,
  segments: CompactSummarySnapshotSegment[],
  categories: QueryCategoryRule[],
  filterCategories?: string[][]
): {
  window: WindowQueryResult;
  by_period: CategoryPeriodData;
} {
  const logicalPeriods = buildCompactSummaryLogicalPeriods(timeperiod);
  const queryPeriods = buildCompactSummarySnapshotPeriods(timeperiod);
  const segmentMap = new Map(segments.map(segment => [segment.logicalPeriod, segment.result]));
  const results = logicalPeriods.map(logicalPeriod => segmentMap.get(logicalPeriod));
  return buildCompactSummaryWindowData(queryPeriods, results, categories, filterCategories);
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
  return getEventTiming(event).startMs;
}

function eventEndMs(event: IEvent): number {
  return getEventTiming(event).endMs;
}

function bucketStartMs(bucket: IBucket): number | null {
  const start = bucket.first_seen || bucket.metadata?.start || bucket.created || null;
  if (!start) return null;
  const startMs = new Date(start).getTime();
  return Number.isFinite(startMs) ? startMs : null;
}

function bucketEndMs(bucket: IBucket): number | null {
  const end = bucket.last_updated || bucket.metadata?.end || bucket.first_seen || null;
  if (!end) return null;
  const endMs = new Date(end).getTime();
  return Number.isFinite(endMs) ? endMs : null;
}

function hostHasBucketOverlap(
  buckets: IBucket[],
  host: string,
  periodStartMs: number,
  periodEndMs: number
): boolean {
  return buckets.some(bucket => {
    const bucketHost = bucket.hostname || bucket.data?.hostname;
    if (bucketHost !== host) return false;

    const startMs = bucketStartMs(bucket);
    const endMs = bucketEndMs(bucket);

    if (startMs !== null && endMs !== null) {
      return startMs < periodEndMs && endMs > periodStartMs;
    }

    if (endMs !== null) {
      return endMs > periodStartMs;
    }

    if (startMs !== null) {
      return startMs < periodEndMs;
    }

    if (bucketHost === host) {
      return true;
    }

    return false;
  });
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
  activity_cache_meta: ActivityResultCacheMeta | null;

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
    activity_cache_meta: null,

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

    shouldQueryWindowData(query_options: QueryOptions) {
      return hasRequestedVisualization(query_options, WINDOW_VISUALIZATIONS);
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

    shouldRefreshBucketsForQuery(query_options: QueryOptions) {
      return (
        Boolean(query_options.force) ||
        this.shouldIncludeBrowserData(query_options) ||
        this.shouldQueryEditor(query_options)
      );
    },

    shouldIncludeStopwatchData(query_options: QueryOptions) {
      return Boolean(query_options.include_stopwatch);
    },

    shouldUseCompactWindowSummaryQuery(query_options: QueryOptions) {
      if (!this.shouldQueryWindowData(query_options)) {
        return false;
      }

      if (this.shouldIncludeBrowserData(query_options) || this.shouldIncludeWindowTitles(query_options)) {
        return false;
      }

      if (!Array.isArray(query_options.requested_visualizations)) {
        return false;
      }

      if (query_options.requested_visualizations.length === 0) {
        return false;
      }

      return query_options.requested_visualizations.every(type =>
        COMPACT_WINDOW_SUMMARY_VISUALIZATIONS.has(type)
      );
    },

    shouldQueryActiveHistory(query_options: QueryOptions) {
      // The legacy period-usage widget is no longer rendered anywhere in the UI,
      // so keep summary/browser/editor snapshots to the minimum query set.
      return false;
    },

    buildActivityResultCacheKey(query_options: QueryOptions): string | null {
      if (!query_options.timeperiod) {
        return null;
      }

      const categoryStore = useCategoryStore();
      const sortedHosts = query_options.host
        .split(',')
        .map(host => host.trim())
        .filter(Boolean)
        .sort()
        .join(',');

      return JSON.stringify({
        host: sortedHosts,
        timeperiod: timeperiodToStr(query_options.timeperiod),
        filter_afk: Boolean(query_options.filter_afk),
        include_audible: Boolean(query_options.include_audible),
        include_stopwatch: Boolean(query_options.include_stopwatch),
        always_active_pattern: query_options.always_active_pattern || '',
        filter_categories: query_options.filter_categories || [],
        requested_visualizations: query_options.requested_visualizations || [],
        categories: serializeQueryCategoryRules(categoryStore.queryRules),
        category_classes: categoryStore.classes.map(category => ({
          name: category.name,
          color: category.color,
          score: category.score,
        })),
        buckets: {
          afk: [...this.buckets.afk].sort(),
          window: [...this.buckets.window].sort(),
          editor: [...this.buckets.editor].sort(),
          browser: [...this.buckets.browser].sort(),
          android: [...this.buckets.android].sort(),
          stopwatch: [...this.buckets.stopwatch].sort(),
        },
      });
    },

    getActivityResultCacheTtl(query_options: QueryOptions): number {
      if (!query_options.timeperiod) {
        return ACTIVITY_RESULT_CACHE_LIVE_TTL_MS;
      }

      if (
        !(
          query_options.timeperiod.length[0] === 1 &&
          query_options.timeperiod.length[1].startsWith('day')
        )
      ) {
        return ACTIVITY_RESULT_CACHE_HISTORICAL_TTL_MS;
      }

      const [, endIso] = timeperiodToStr(query_options.timeperiod).split('/');
      const endMs = new Date(endIso).getTime();

      return endMs >= Date.now() - 5 * 60 * 1000
        ? ACTIVITY_RESULT_CACHE_LIVE_TTL_MS
        : ACTIVITY_RESULT_CACHE_HISTORICAL_TTL_MS;
    },

    shouldPersistActivityResultCache(query_options: QueryOptions): boolean {
      if (!query_options.timeperiod) {
        return false;
      }

      return !(
        query_options.timeperiod.length[0] === 1 &&
        query_options.timeperiod.length[1].startsWith('day')
      );
    },

    shouldRestoreHistoricalActivitySnapshot(query_options: QueryOptions): boolean {
      return false;
    },

    buildHistoricalSummarySnapshotKey(query_options: QueryOptions): string | null {
      if (!this.shouldRestoreHistoricalActivitySnapshot(query_options) || !query_options.timeperiod) {
        return null;
      }

      const categoryStore = useCategoryStore();
      const sortedHosts = query_options.host
        .split(',')
        .map(host => host.trim())
        .filter(Boolean)
        .sort()
        .join(',');

      return JSON.stringify({
        host: sortedHosts,
        timeperiod: timeperiodToStr(query_options.timeperiod),
        filter_afk: Boolean(query_options.filter_afk),
        include_audible: Boolean(query_options.include_audible),
        include_stopwatch: Boolean(query_options.include_stopwatch),
        always_active_pattern: query_options.always_active_pattern || '',
        filter_categories: query_options.filter_categories || [],
        requested_visualizations: query_options.requested_visualizations || [],
        categories: serializeQueryCategoryRules(categoryStore.queryRules),
        category_classes: categoryStore.classes.map(category => ({
          name: category.name,
          color: category.color,
          score: category.score,
        })),
      });
    },

    getPersistedActivityResultCacheTtl(query_options: QueryOptions): number {
      return this.shouldPersistActivityResultCache(query_options)
        ? ACTIVITY_RESULT_CACHE_HISTORICAL_TTL_MS
        : this.getActivityResultCacheTtl(query_options);
    },

    snapshotCurrentResults(): ActivityResultCacheSnapshot {
      return _.cloneDeep({
        windowTopApps: this.window.top_apps,
        windowTopTitles: this.window.top_titles,
        browserDuration: this.browser.duration,
        browserTopUrls: this.browser.top_urls,
        browserTopDomains: this.browser.top_domains,
        browserTopTitles: this.browser.top_titles,
        editorDuration: this.editor.duration,
        editorTopFiles: this.editor.top_files,
        editorTopProjects: this.editor.top_projects,
        editorTopLanguages: this.editor.top_languages,
        categoryTop: this.category.top,
        categoryByPeriod: this.category.by_period,
        activeDuration: this.active.duration,
        activeEvents: this.active.events,
        stopwatchTop: this.stopwatch.top_stopwatches,
      });
    },

    restoreCachedResults(
      snapshot: ActivityResultCacheSnapshot,
      request_nonce: number,
      meta: ActivityResultCacheMeta | null = null
    ) {
      if (!this.isCurrentRequest(request_nonce)) return;

      this.window.top_apps = _.cloneDeep(snapshot.windowTopApps);
      this.window.top_titles = _.cloneDeep(snapshot.windowTopTitles);

      this.browser.duration = snapshot.browserDuration;
      this.browser.top_urls = _.cloneDeep(snapshot.browserTopUrls);
      this.browser.top_domains = _.cloneDeep(snapshot.browserTopDomains);
      this.browser.top_titles = _.cloneDeep(snapshot.browserTopTitles);

      this.editor.duration = snapshot.editorDuration;
      this.editor.top_files = _.cloneDeep(snapshot.editorTopFiles);
      this.editor.top_projects = _.cloneDeep(snapshot.editorTopProjects);
      this.editor.top_languages = _.cloneDeep(snapshot.editorTopLanguages);

      this.category.top = _.cloneDeep(snapshot.categoryTop);
      this.category.by_period = _.cloneDeep(snapshot.categoryByPeriod);

      this.active.duration = snapshot.activeDuration;
      this.active.events = _.cloneDeep(snapshot.activeEvents);

      this.stopwatch.top_stopwatches = _.cloneDeep(snapshot.stopwatchTop);
      this.activity_cache_meta = meta ? _.cloneDeep(meta) : null;
    },

    async cacheCurrentResults(query_options: QueryOptions) {
      const cacheKey = this.buildActivityResultCacheKey(query_options);
      const historicalSnapshotKey = this.buildHistoricalSummarySnapshotKey(query_options);
      if (!cacheKey) {
        return;
      }

      const entry = {
        createdAt: Date.now(),
        snapshot: this.snapshotCurrentResults(),
        meta: this.activity_cache_meta ? _.cloneDeep(this.activity_cache_meta) : undefined,
      };
      activityResultCache.set(cacheKey, entry);
      persistActivityResultCache();
      if (historicalSnapshotKey) {
        historicalSummarySnapshotCache.set(historicalSnapshotKey, entry);
        persistHistoricalSummarySnapshotCache();
      }
      if (this.shouldPersistActivityResultCache(query_options)) {
        await persistActivityResultCacheEntry(cacheKey, entry);
      } else {
        void deletePersistedActivityResultCacheEntry(cacheKey);
      }
    },

    async refreshPersistedCompactSummary(
      query_options: QueryOptions,
      request_nonce: number,
      activityCacheKey: string
    ) {
      if (
        !query_options.timeperiod ||
        !this.shouldUseCompactWindowSummaryQuery(query_options) ||
        !this.shouldRestoreHistoricalActivitySnapshot(query_options)
      ) {
        return;
      }

      const logicalPeriods = buildCompactSummaryLogicalPeriods(query_options.timeperiod);
      const queryPeriods = buildCompactSummarySnapshotPeriods(query_options.timeperiod);
      if (logicalPeriods.length === 0 || queryPeriods.length === 0) {
        return;
      }

      const dashboardSnapshot = await fetchDashboardSummarySnapshot({
        range: parseExecutionRange(queryPeriods),
        categoryPeriods: logicalPeriods,
        windowBucketIds: this.buckets.window,
        afkBucketIds: this.buckets.afk,
        stopwatchBucketIds:
          query_options.include_stopwatch && this.buckets.stopwatch.length > 0
            ? this.buckets.stopwatch
            : [],
        filterAfk: query_options.filter_afk,
        categories: useCategoryStore().queryRules,
        filterCategories: query_options.filter_categories,
        alwaysActivePattern: query_options.always_active_pattern,
      });

      if (dashboardSnapshot) {
        if (!this.isCurrentRequest(request_nonce)) return;

        this.activity_cache_meta = null;
        this.query_window_completed(dashboardSnapshot.window, request_nonce);
        if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
          this.query_category_time_by_period_completed(
            { by_period: dashboardSnapshot.by_period },
            request_nonce
          );
        }
        await this.cacheCurrentResults(query_options);
        return;
      }

      const existingSegments = this.activity_cache_meta?.compactSummarySegments || [];
      const existingSegmentMap = new Map(
        existingSegments.map(segment => [segment.logicalPeriod, segment])
      );
      const periodsToRefresh: string[] = [];

      logicalPeriods.forEach((logicalPeriod, index) => {
        const queryPeriod = queryPeriods[index];
        const existing = existingSegmentMap.get(logicalPeriod);
        if (!existing || existing.queryPeriod !== queryPeriod) {
          periodsToRefresh.push(queryPeriod);
        }
      });

      if (periodsToRefresh.length === 0) {
        return;
      }

      const categories = useCategoryStore().queryRules;
      const hosts = query_options.host
        .split(',')
        .map(host => host.trim())
        .filter(Boolean);

      let data: Array<CompactSummaryQueryResult | undefined> = [];
      if (hosts.length > 1) {
        const q = queries.multideviceSummarySnapshotQuery({
          hosts,
          filter_afk: query_options.filter_afk,
          categories: [],
          filter_categories: [],
          bid_stopwatch:
            query_options.include_stopwatch && this.buckets.stopwatch.length > 0
              ? this.buckets.stopwatch[0]
              : undefined,
          host_params: {},
          always_active_pattern: query_options.always_active_pattern,
        });
        data = await getClient().query(periodsToRefresh, q, {
          name: 'multideviceSummarySnapshotQuery.refresh',
          verbose: true,
        });
      } else {
        const q = queries.desktopSummarySnapshotQuery({
          bid_window: this.buckets.window[0],
          bid_afk: this.buckets.afk[0],
          bid_browsers: this.buckets.browser,
          bid_stopwatch:
            query_options.include_stopwatch && this.buckets.stopwatch.length > 0
              ? this.buckets.stopwatch[0]
              : undefined,
          filter_afk: query_options.filter_afk,
          categories: [],
          filter_categories: [],
          include_audible: query_options.include_audible,
          always_active_pattern: query_options.always_active_pattern,
        });
        data = await getClient().query(periodsToRefresh, q, {
          name: 'desktopSummarySnapshotQuery.refresh',
          verbose: true,
        });
      }

      if (!this.isCurrentRequest(request_nonce)) return;

      const refreshedByQueryPeriod = new Map(
        periodsToRefresh.map((period, index) => {
          const result = data[index];
          return [
            period,
            {
              events: ensureEventList(result?.events),
              manual_events: ensureEventList(result?.manual_events),
              active_duration: ensureDuration(result?.active_duration),
            } satisfies CompactSummaryQueryResult,
          ];
        })
      );

      const nextSegments: CompactSummarySnapshotSegment[] = logicalPeriods.map((logicalPeriod, index) => {
        const queryPeriod = queryPeriods[index];
        const refreshed = refreshedByQueryPeriod.get(queryPeriod);
        if (refreshed) {
          return {
            logicalPeriod,
            queryPeriod,
            result: refreshed,
          };
        }

        const existing = existingSegmentMap.get(logicalPeriod);
        if (existing && existing.queryPeriod === queryPeriod) {
          return existing;
        }

        return {
          logicalPeriod,
          queryPeriod,
          result: {
            events: [],
            manual_events: [],
            active_duration: 0,
          },
        };
      });

      const compactSummary = buildCompactSummaryWindowDataFromSegments(
        query_options.timeperiod,
        nextSegments,
        categories,
        query_options.filter_categories
      );

      if (!this.isCurrentRequest(request_nonce)) return;

      this.activity_cache_meta = {
        compactSummarySegments: _.cloneDeep(nextSegments),
      };
      this.query_window_completed(compactSummary.window, request_nonce);
      if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
        this.query_category_time_by_period_completed(
          { by_period: compactSummary.by_period },
          request_nonce
        );
      }
      await this.cacheCurrentResults(query_options);

      const refreshedEntry = activityResultCache.get(activityCacheKey);
      if (refreshedEntry) {
        activityResultCache.set(activityCacheKey, {
          ...refreshedEntry,
          meta: this.activity_cache_meta ? _.cloneDeep(this.activity_cache_meta) : undefined,
        });
      }
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

    primeCategoryPeriodCache(query_options: QueryOptions, events: IEvent[], isAndroid = false) {
      if (!this.shouldQueryCategoryTimeByPeriod(query_options) || !query_options.timeperiod) {
        return;
      }

      const periodRange = timeperiodToStr(query_options.timeperiod);
      const [, periodEndIso] = periodRange.split('/');
      const periodEndMs = new Date(periodEndIso).getTime();
      const effectiveEndMs = Math.min(periodEndMs, Date.now());

      this.category.period_cache = {
        key: this.buildCategoryPeriodCacheKey(query_options, isAndroid, periodRange),
        fetched_until:
          Number.isFinite(effectiveEndMs) && effectiveEndMs > 0
            ? new Date(effectiveEndMs).toISOString()
            : null,
        events: [...events],
      };
    },

    primeCategoryTimeByPeriod(
      query_options: QueryOptions,
      events: IEvent[],
      request_nonce: number
    ) {
      if (!this.shouldQueryCategoryTimeByPeriod(query_options) || !query_options.timeperiod) {
        return;
      }

      let periods = buildCategoryPeriods(query_options.timeperiod);
      periods = periods.filter(period => new Date(period.split('/')[0]) < new Date());

      if (periods.length === 0) {
        this.query_category_time_by_period_completed({ by_period: {} }, request_nonce);
        return;
      }

      const by_period = buildCategoryByPeriodFromEvents(periods, events);
      if (query_options.dont_query_inactive && this.active.events.length > 0) {
        periods.forEach(period => {
          if (!periodHasActivity(period, this.active.events)) {
            by_period[period] = { cat_events: [] };
          }
        });
      }

      const ordered_by_period = Object.fromEntries(
        periods.map(period => [period, by_period[period] || { cat_events: [] }])
      );
      this.query_category_time_by_period_completed({ by_period: ordered_by_period }, request_nonce);
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
          if (this.category.by_period !== null) {
            // Already derived from the initial summary snapshot.
          } else if (this.window.available || this.android.available) {
            await this.query_category_time_by_period(query_options, request_nonce);
          } else {
            this.query_category_time_by_period_completed(undefined, request_nonce);
          }
        }

        if (!this.isCurrentRequest(request_nonce)) return;

        if (!this.shouldQueryActiveHistory(query_options)) {
          this.query_active_history_completed(undefined, request_nonce);
        } else if (this.active.available) {
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

      if (!query_options.timeperiod) {
        query_options.timeperiod = dateToTimeperiod(query_options.date, settingsStore.startOfDay);
      }

      const bucketsStore = useBucketsStore();
      if (this.shouldRefreshBucketsForQuery(query_options)) {
        await bucketsStore.loadBuckets();
      } else {
        await bucketsStore.ensureLoaded();
      }

      const requestedHosts = query_options.host.split(',').map(h => h.trim());
      const expandedHosts = expandHostsToEffectiveGroup(
        requestedHosts,
        settingsStore.deviceMappings,
        bucketsStore.hosts
      );
      const [periodStartIso, periodEndIso] = timeperiodToStr(query_options.timeperiod).split('/');
      const periodStartMs = new Date(periodStartIso).getTime();
      const periodEndMs = new Date(periodEndIso).getTime();
      const relevantHosts = expandedHosts.filter(host =>
        hostHasBucketOverlap(bucketsStore.buckets, host, periodStartMs, periodEndMs)
      );
      const resolvedHosts = relevantHosts.length > 0 ? relevantHosts : expandedHosts;

      if (resolvedHosts.length > 0) {
        query_options.host = resolvedHosts.join(',');
      }

      console.info('Query options: ', query_options);
      if (query_options.force) {
        clearEventFetchCache();
        clearActivityResultCache();
        await clearPersistedActivityResultCache();
      }
      hydrateActivityResultCache();
      if (!this.loaded || this.query_options !== query_options || query_options.force) {
        console.log('ACTIVITY STORE: Actually loading data now...');
        const request_nonce = this.start_loading(query_options);
        const historicalSnapshotKey = query_options.force
          ? null
          : this.buildHistoricalSummarySnapshotKey(query_options);
        const historicalSnapshotEntry = historicalSnapshotKey
          ? historicalSummarySnapshotCache.get(historicalSnapshotKey)
          : undefined;

        if (historicalSnapshotEntry) {
          this.restoreCachedResults(
            historicalSnapshotEntry.snapshot,
            request_nonce,
            historicalSnapshotEntry.meta || null
          );
        }

        try {
          await this.get_buckets(query_options);
          if (!this.isCurrentRequest(request_nonce)) return;

          // TODO: These queries can actually run in parallel, but since server won't process them in parallel anyway we won't.
          this.set_available();
          const activityCacheKey = this.buildActivityResultCacheKey(query_options);
          const shouldRestoreHistoricalSnapshot =
            this.shouldRestoreHistoricalActivitySnapshot(query_options);

          if (historicalSnapshotEntry && activityCacheKey && shouldRestoreHistoricalSnapshot) {
            activityResultCache.set(activityCacheKey, historicalSnapshotEntry);
            persistActivityResultCache();

            const inflightRefresh = activityResultInflightCache.get(activityCacheKey);
            if (!inflightRefresh) {
              const refreshPromise = this.refreshPersistedCompactSummary(
                query_options,
                request_nonce,
                activityCacheKey
              )
                .catch(error => {
                  if (!this.isAbortError(error) && this.isCurrentRequest(request_nonce)) {
                    console.error('Failed to refresh historical compact summary', error);
                  }
                })
                .finally(() => {
                  if (activityResultInflightCache.get(activityCacheKey) === refreshPromise) {
                    activityResultInflightCache.delete(activityCacheKey);
                  }
                });
              activityResultInflightCache.set(activityCacheKey, refreshPromise);
            }
            return;
          }

          if (!query_options.force) {
            pruneExpiredActivityResultCache();
            const cacheTtl = this.getActivityResultCacheTtl(query_options);
            const persistedCacheTtl = this.getPersistedActivityResultCacheTtl(query_options);
            const cachedEntry = activityCacheKey
              ? activityResultCache.get(activityCacheKey)
              : undefined;

	            if (
                cachedEntry &&
                (Date.now() - cachedEntry.createdAt <= cacheTtl || shouldRestoreHistoricalSnapshot)
              ) {
	              this.restoreCachedResults(
                  cachedEntry.snapshot,
                  request_nonce,
                  cachedEntry.meta || null
                );
                if (activityCacheKey && shouldRestoreHistoricalSnapshot) {
                  const inflightRefresh = activityResultInflightCache.get(activityCacheKey);
                  if (!inflightRefresh) {
                    const refreshPromise = this.refreshPersistedCompactSummary(
                      query_options,
                      request_nonce,
                      activityCacheKey
                    )
                      .catch(error => {
                        if (!this.isAbortError(error) && this.isCurrentRequest(request_nonce)) {
                          console.error('Failed to refresh cached compact summary', error);
                        }
                      })
                      .finally(() => {
                        if (activityResultInflightCache.get(activityCacheKey) === refreshPromise) {
                          activityResultInflightCache.delete(activityCacheKey);
                        }
                      });
                    activityResultInflightCache.set(activityCacheKey, refreshPromise);
                  }
                }
	              return;
	            }

              if (activityCacheKey) {
                const persistedEntry = await readPersistedActivityResultCacheEntry(activityCacheKey);
                if (!this.isCurrentRequest(request_nonce)) return;

                if (
                  persistedEntry &&
                  (Date.now() - persistedEntry.createdAt <= persistedCacheTtl ||
                    shouldRestoreHistoricalSnapshot)
                ) {
                  activityResultCache.set(activityCacheKey, persistedEntry);
                  persistActivityResultCache();
                  this.restoreCachedResults(
                    persistedEntry.snapshot,
                    request_nonce,
                    persistedEntry.meta || null
                  );
                  if (shouldRestoreHistoricalSnapshot) {
                    const inflightRefresh = activityResultInflightCache.get(activityCacheKey);
                    if (!inflightRefresh) {
                      const refreshPromise = this.refreshPersistedCompactSummary(
                        query_options,
                        request_nonce,
                        activityCacheKey
                      )
                        .catch(error => {
                          if (!this.isAbortError(error) && this.isCurrentRequest(request_nonce)) {
                            console.error('Failed to refresh persisted compact summary', error);
                          }
                        })
                        .finally(() => {
                          if (activityResultInflightCache.get(activityCacheKey) === refreshPromise) {
                            activityResultInflightCache.delete(activityCacheKey);
                          }
                        });
                      activityResultInflightCache.set(activityCacheKey, refreshPromise);
                    }
                  }
                  return;
                }

                if (
                  persistedEntry &&
                  Date.now() - persistedEntry.createdAt > ACTIVITY_RESULT_CACHE_HISTORICAL_TTL_MS
                ) {
                  void deletePersistedActivityResultCacheEntry(activityCacheKey);
                }
              }

	            const inflightLoad = activityCacheKey
	              ? activityResultInflightCache.get(activityCacheKey)
	              : undefined;
	            if (inflightLoad) {
	              try {
	                await inflightLoad;
	              } catch {
	                // Fall through and perform a fresh load if the shared prefetch failed.
	              }

	              if (!this.isCurrentRequest(request_nonce)) return;

	              const refreshedEntry = activityCacheKey
	                ? activityResultCache.get(activityCacheKey)
	                : undefined;
	              if (refreshedEntry && Date.now() - refreshedEntry.createdAt <= cacheTtl) {
	                this.restoreCachedResults(refreshedEntry.snapshot, request_nonce);
	                return;
	              }
	            }
	          }

	          const inflightDeferred = activityCacheKey ? createDeferredPromise<void>() : null;
	          if (activityCacheKey && inflightDeferred) {
	            activityResultInflightCache.set(activityCacheKey, inflightDeferred.promise);
	          }

	          try {
	            if (this.loaded) {
	              await getClient().abort();
	            }

	            const hostsList = query_options.host.split(',').map(h => h.trim());

	            if (this.shouldQueryWindowData(query_options) && this.window.available) {
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
	              console.info(
	                settingsStore.useMultidevice || hostnames.length > 1
	                  ? 'Querying multiple devices'
	                  : 'Querying a single device'
	              );
	              if (hostnames.length > 1) {
	                console.info('Including hosts in multiquery: ', hostnames);
	                await this.query_multidevice_full(query_options, hostnames, request_nonce);
	              } else {
	                await this.query_desktop_full(query_options, request_nonce);
	              }
	            } else if (this.shouldQueryWindowData(query_options) && this.android.available) {
	              await this.query_android(query_options, request_nonce);
	            } else if (this.shouldQueryWindowData(query_options)) {
	              console.log(
	                'Cannot query windows as we are missing either an afk/window bucket pair or an android bucket'
	              );
	              this.query_window_completed(undefined, request_nonce);
	              this.query_category_time_by_period_completed(undefined, request_nonce);
	            }

	            if (!this.isCurrentRequest(request_nonce)) return;

	            if (
	              !this.shouldQueryWindowData(query_options) &&
	              this.shouldIncludeBrowserData(query_options)
	            ) {
	              await this.query_browser_only(query_options, hostsList, request_nonce);
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

	            await this.cacheCurrentResults(query_options);
	            inflightDeferred?.resolve();
	            void this.loadDeferredData(query_options, request_nonce);
	          } catch (error) {
	            inflightDeferred?.reject(error);
	            throw error;
	          } finally {
	            if (
	              activityCacheKey &&
	              inflightDeferred &&
	              activityResultInflightCache.get(activityCacheKey) === inflightDeferred.promise
	            ) {
	              activityResultInflightCache.delete(activityCacheKey);
	            }
	          }
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
      clearEventFetchCache();
      this.request_nonce += 1;
      this.active_request_nonce = this.request_nonce;
      this.loaded = false;
      this.query_options = null;
      this.activity_cache_meta = null;
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
      const periods = buildExecutionQueryPeriods(timeperiod);
      const executionRange = parseExecutionRange(periods);
      const categories = useCategoryStore().queryRules;
      const include_window_titles = this.shouldIncludeWindowTitles(query_options);
      const include_browser_data = this.shouldIncludeBrowserData(query_options);
      const include_stopwatch_data = this.shouldIncludeStopwatchData(query_options);
      const useCompactWindowSummary = this.shouldUseCompactWindowSummaryQuery(query_options);
      const shouldUseSnapshotPeriods =
        useCompactWindowSummary &&
        executionRange &&
        !(timeperiod.length[0] === 1 && timeperiod.length[1].startsWith('day'));

      if (periods.length === 0) {
        this.query_window_completed({}, request_nonce);
        this.query_browser_completed({ domains: [], urls: [], titles: [], duration: 0 }, request_nonce);
        this.query_stopwatch_completed({ stopwatch_events: [] }, request_nonce);
        if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
          this.query_category_time_by_period_completed({ by_period: {} }, request_nonce);
        }
        return;
      }

      if (useCompactWindowSummary) {
        const summaryPeriods = shouldUseSnapshotPeriods
          ? buildCompactSummarySnapshotPeriods(timeperiod)
          : periods;
        if (summaryPeriods.length === 0) {
          this.query_window_completed({}, request_nonce);
          this.query_browser_completed(
            { domains: [], urls: [], titles: [], duration: 0 },
            request_nonce
          );
          this.query_stopwatch_completed({ stopwatch_events: [] }, request_nonce);
          if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
            this.query_category_time_by_period_completed({ by_period: {} }, request_nonce);
          }
          return;
        }
        if (shouldUseSnapshotPeriods) {
          const dashboardSnapshot = await fetchDashboardSummarySnapshot({
            range: parseExecutionRange(summaryPeriods),
            categoryPeriods: buildCompactSummaryLogicalPeriods(timeperiod),
            windowBucketIds: this.buckets.window,
            afkBucketIds: this.buckets.afk,
            stopwatchBucketIds:
              include_stopwatch && include_stopwatch_data && this.buckets.stopwatch.length > 0
                ? this.buckets.stopwatch
                : [],
            filterAfk: filter_afk,
            categories,
            filterCategories: filter_categories,
            alwaysActivePattern: always_active_pattern,
          });

          if (dashboardSnapshot) {
            if (!this.isCurrentRequest(request_nonce)) return;

            this.activity_cache_meta = null;
            this.query_window_completed(dashboardSnapshot.window, request_nonce);
            this.query_browser_completed(
              { domains: [], urls: [], titles: [], duration: 0 },
              request_nonce
            );
            this.query_stopwatch_completed({ stopwatch_events: [] }, request_nonce);
            if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
              this.query_category_time_by_period_completed(
                { by_period: dashboardSnapshot.by_period },
                request_nonce
              );
            }
            return;
          }
        }
        const q = queries.multideviceSummarySnapshotQuery({
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
        const data = await getClient().query(summaryPeriods, q, {
          name: 'multideviceSummarySnapshotQuery',
          verbose: true,
        });
        if (!this.isCurrentRequest(request_nonce)) return;

        const compactSummary = buildCompactSummaryWindowData(
          summaryPeriods,
          data || [],
          categories,
          filter_categories
        );
        this.activity_cache_meta = {
          compactSummarySegments: buildCompactSummarySegments(timeperiod, data || []),
        };
        this.query_window_completed(compactSummary.window, request_nonce);
        this.query_browser_completed(
          { domains: [], urls: [], titles: [], duration: 0 },
          request_nonce
        );
        this.query_stopwatch_completed({ stopwatch_events: [] }, request_nonce);
        if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
          this.query_category_time_by_period_completed(
            { by_period: compactSummary.by_period },
            request_nonce
          );
        }
        return;
      }

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

      const rawEvents = (data || []).flatMap((result: DesktopEventsQueryResult | undefined) =>
        ensureEventList(result?.events)
      );
      const activeEvents = (data || []).flatMap((result: DesktopEventsQueryResult | undefined) =>
        ensureEventList(result?.active_events)
      );
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
      this.primeCategoryPeriodCache(query_options, filteredEvents);
      this.primeCategoryTimeByPeriod(query_options, filteredEvents, request_nonce);

      if (!this.isCurrentRequest(request_nonce)) return;

      if (include_browser_data) {
        const bucketsStore = useBucketsStore();
        const browserBucketsByHost = Object.fromEntries(
          hosts.map(host => [host, bucketsStore.bucketsBrowser(host)])
        );
        const hasBrowserBuckets = Object.values(browserBucketsByHost).some(
          bucketIds => bucketIds.length > 0
        );

        if (hasBrowserBuckets) {
          const browserQuery = queries.multideviceBrowserEventsQuery({
            hosts,
            browserBucketsByHost,
          });
          const browserData = await getClient().query(periods, browserQuery, {
            name: 'multideviceBrowserEventsQuery',
            verbose: true,
          });
          if (!this.isCurrentRequest(request_nonce)) return;
          const browserEvents = (browserData || []).flatMap(
            (result: { events?: IEvent[] | null } | undefined) => ensureEventList(result?.events)
          );
          this.query_browser_completed(aggregateBrowserEventsLocally(browserEvents), request_nonce);
        } else {
          this.query_browser_completed(
            { domains: [], urls: [], titles: [], duration: 0 },
            request_nonce
          );
        }
      } else {
        this.query_browser_completed({ domains: [], urls: [], titles: [], duration: 0 }, request_nonce);
      }
    },

    async query_browser_only(query_options: QueryOptions, hosts: string[], request_nonce: number) {
      const periods = buildExecutionQueryPeriods(query_options.timeperiod);
      const executionRange = parseExecutionRange(periods);
      const bucketsStore = useBucketsStore();
      const browserBucketsByHost = Object.fromEntries(
        hosts.map(host => [host, bucketsStore.bucketsBrowser(host)])
      );
      const browserHosts = hosts.filter(host => (browserBucketsByHost[host] || []).length > 0);

      if (periods.length === 0 || browserHosts.length === 0) {
        this.query_browser_completed(
          { domains: [], urls: [], titles: [], duration: 0 },
          request_nonce
        );
        return;
      }

      if (executionRange && browserHosts.length === 1) {
        const host = browserHosts[0];
        const browserBucketIds = browserBucketsByHost[host] || [];

        if (
          executionRange.end.getTime() - executionRange.start.getTime() >=
          BROWSER_DIRECT_BUCKET_THRESHOLD_MS
        ) {
          const browserEvents = await fetchEventsFromBuckets(browserBucketIds, executionRange, {
            useCache: !query_options.force,
          });
          if (!this.isCurrentRequest(request_nonce)) return;
          this.query_browser_completed(
            aggregateBrowserEventsLocally(withBrowserDomains(browserEvents)),
            request_nonce
          );
          return;
        }

        if (
          executionRange.end.getTime() - executionRange.start.getTime() >=
          BROWSER_SERVER_SUMMARY_THRESHOLD_MS
        ) {
          const browserData = await getClient().query(
            periods,
            queries.desktopBrowserQuery({
              bid_window: bucketsStore.bucketsWindow(host)[0],
              bid_browsers: browserBucketIds,
            }),
            {
              name: 'desktopBrowserQuery',
              verbose: true,
            }
          );
          if (!this.isCurrentRequest(request_nonce)) return;
          this.query_browser_completed(browserData?.[0], request_nonce);
          return;
        }

        const [windowEvents, browserEvents] = await Promise.all([
          fetchEventsFromBuckets(bucketsStore.bucketsWindow(host), executionRange, {
            useCache: !query_options.force,
          }),
          fetchEventsFromBuckets(browserBucketIds, executionRange, {
            useCache: !query_options.force,
          }),
        ]);
        if (!this.isCurrentRequest(request_nonce)) return;

        const focusedBrowserEvents = withBrowserDomains(
          intersectEventsWithIntervals(
            browserEvents,
            buildBrowserFocusIntervals(windowEvents, browserBucketIds)
          )
        );
        this.query_browser_completed(
          aggregateBrowserEventsLocally(focusedBrowserEvents),
          request_nonce
        );
        return;
      }

      if (periods.length > 1) {
        const browserQuery = queries.multideviceBrowserQuery({
          hosts: browserHosts,
          browserBucketsByHost,
        });
        const browserData = await getClient().query(periods, browserQuery, {
          name: 'multideviceBrowserQuery',
          verbose: true,
        });
        if (!this.isCurrentRequest(request_nonce)) return;
        this.query_browser_completed(
          combineBrowserPeriodSummaries(browserData || []),
          request_nonce
        );
        return;
      }

      const browserQuery = queries.multideviceBrowserEventsQuery({
        hosts: browserHosts,
        browserBucketsByHost,
      });
      const browserData = await getClient().query(periods, browserQuery, {
        name: 'multideviceBrowserEventsQuery',
        verbose: true,
      });
      if (!this.isCurrentRequest(request_nonce)) return;
      const browserEvents = (browserData || []).flatMap(
        (result: { events?: IEvent[] | null } | undefined) => ensureEventList(result?.events)
      );
      this.query_browser_completed(aggregateBrowserEventsLocally(browserEvents), request_nonce);
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
      const periods = buildExecutionQueryPeriods(timeperiod);
      const executionRange = parseExecutionRange(periods);
      const categories = useCategoryStore().queryRules;
      const include_window_titles = this.shouldIncludeWindowTitles(query_options);
      const include_browser_data = this.shouldIncludeBrowserData(query_options);
      const include_stopwatch_data = this.shouldIncludeStopwatchData(query_options);
      const useCompactWindowSummary = this.shouldUseCompactWindowSummaryQuery(query_options);
      const shouldUseSnapshotPeriods =
        useCompactWindowSummary &&
        executionRange &&
        !(timeperiod.length[0] === 1 && timeperiod.length[1].startsWith('day'));

      if (periods.length === 0) {
        this.query_window_completed({}, request_nonce);
        this.query_browser_completed({ domains: [], urls: [], titles: [], duration: 0 }, request_nonce);
        this.query_stopwatch_completed({ stopwatch_events: [] }, request_nonce);
        if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
          this.query_category_time_by_period_completed({ by_period: {} }, request_nonce);
        }
        return;
      }

      if (useCompactWindowSummary && shouldUseSnapshotPeriods) {
        const snapshotPeriods = buildCompactSummarySnapshotPeriods(timeperiod);
        if (snapshotPeriods.length === 0) {
          this.query_window_completed({}, request_nonce);
          this.query_browser_completed(
            { domains: [], urls: [], titles: [], duration: 0 },
            request_nonce
          );
          this.query_stopwatch_completed({ stopwatch_events: [] }, request_nonce);
          if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
            this.query_category_time_by_period_completed({ by_period: {} }, request_nonce);
          }
          return;
        }
        const dashboardSnapshot = await fetchDashboardSummarySnapshot({
          range: parseExecutionRange(snapshotPeriods),
          categoryPeriods: buildCompactSummaryLogicalPeriods(timeperiod),
          windowBucketIds: this.buckets.window,
          afkBucketIds: this.buckets.afk,
          stopwatchBucketIds:
            include_stopwatch && include_stopwatch_data && this.buckets.stopwatch.length > 0
              ? this.buckets.stopwatch
              : [],
          filterAfk: filter_afk,
          categories,
          filterCategories: filter_categories,
          alwaysActivePattern: always_active_pattern,
        });

        if (dashboardSnapshot) {
          if (!this.isCurrentRequest(request_nonce)) return;

          this.activity_cache_meta = null;
          this.query_window_completed(dashboardSnapshot.window, request_nonce);
          this.query_browser_completed(
            { domains: [], urls: [], titles: [], duration: 0 },
            request_nonce
          );
          this.query_stopwatch_completed({ stopwatch_events: [] }, request_nonce);
          if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
            this.query_category_time_by_period_completed(
              { by_period: dashboardSnapshot.by_period },
              request_nonce
            );
          }
          return;
        }
        const q = queries.desktopSummarySnapshotQuery({
          bid_window: this.buckets.window[0],
          bid_afk: this.buckets.afk[0],
          bid_browsers: this.buckets.browser,
          bid_stopwatch:
            include_stopwatch && include_stopwatch_data && this.buckets.stopwatch.length > 0
              ? this.buckets.stopwatch[0]
              : undefined,
          filter_afk,
          categories: [],
          filter_categories: [],
          include_audible,
          always_active_pattern,
        });
        const data = await getClient().query(snapshotPeriods, q, {
          name: 'desktopSummarySnapshotQuery',
          verbose: true,
        });
        if (!this.isCurrentRequest(request_nonce)) return;

        const compactSummary = buildCompactSummaryWindowData(
          snapshotPeriods,
          data || [],
          categories,
          filter_categories
        );
        this.activity_cache_meta = {
          compactSummarySegments: buildCompactSummarySegments(timeperiod, data || []),
        };
        this.query_window_completed(compactSummary.window, request_nonce);
        this.query_browser_completed(
          { domains: [], urls: [], titles: [], duration: 0 },
          request_nonce
        );
        this.query_stopwatch_completed({ stopwatch_events: [] }, request_nonce);
        if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
          this.query_category_time_by_period_completed(
            { by_period: compactSummary.by_period },
            request_nonce
          );
        }
        return;
      }

      if (useCompactWindowSummary && executionRange) {
        const [windowEvents, afkEvents, completedStopwatchEvents] = await Promise.all([
          fetchEventsFromBuckets(this.buckets.window, executionRange, {
            useCache: !query_options.force,
          }),
          fetchEventsFromBuckets(this.buckets.afk, executionRange, {
            useCache: !query_options.force,
          }),
          include_stopwatch && include_stopwatch_data && this.buckets.stopwatch.length > 0
            ? fetchCompletedStopwatchEvents(this.buckets.stopwatch, executionRange, {
                useCache: !query_options.force,
              })
            : Promise.resolve([]),
        ]);
        if (!this.isCurrentRequest(request_nonce)) return;

        const activeIntervals = buildActiveIntervals(afkEvents, windowEvents, always_active_pattern);
        const stopwatchIntervals = completedStopwatchEvents
          .map(eventToInterval)
          .filter((interval): interval is NumericInterval => interval !== null);
        const baseVisibleIntervals = filter_afk
          ? activeIntervals
          : [
              {
                startMs: executionRange.start.getTime(),
                endMs: executionRange.end.getTime(),
              },
            ];
        const visibleWindowIntervals = include_stopwatch_data && stopwatchIntervals.length > 0
          ? subtractIntervalsFromIntervals(
              baseVisibleIntervals,
              stopwatchIntervals
            )
          : baseVisibleIntervals;
        const effectiveActiveIntervals =
          include_stopwatch_data && stopwatchIntervals.length > 0
            ? mergeIntervals([...activeIntervals, ...stopwatchIntervals])
            : activeIntervals;

        const categoryPeriods = this.shouldQueryCategoryTimeByPeriod(query_options)
          ? buildCategoryPeriods(timeperiod).filter(period => new Date(period.split('/')[0]) < new Date())
          : [];
        const compactSummary = buildCompactSummaryWindowDataFromSources(
          windowEvents,
          visibleWindowIntervals,
          include_stopwatch_data ? completedStopwatchEvents : [],
          categories,
          filter_categories,
          categoryPeriods
        );
        const activeEvents = intervalsToEvents(effectiveActiveIntervals, { status: 'not-afk' });
        const stopwatch_events =
          include_stopwatch_data && completedStopwatchEvents.length > 0
            ? aggregateEventsByDataKeys(completedStopwatchEvents, ['label'])
            : [];

        this.query_window_completed(
          {
            app_events: compactSummary.window.app_events,
            title_events: [],
            cat_events: compactSummary.window.cat_events,
            active_events: activeEvents,
            duration: compactSummary.window.duration,
          },
          request_nonce
        );
        if (this.shouldQueryCategoryTimeByPeriod(query_options)) {
          this.query_category_time_by_period_completed(
            { by_period: compactSummary.by_period },
            request_nonce
          );
        }
        this.query_browser_completed(
          { domains: [], urls: [], titles: [], duration: 0 },
          request_nonce
        );
        this.query_stopwatch_completed({ stopwatch_events }, request_nonce);
        return;
      }

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

        const rawEvents = (data || []).flatMap((result: DesktopEventsQueryResult | undefined) =>
          ensureEventList(result?.events)
        );
        const activeEvents = (data || []).flatMap((result: DesktopEventsQueryResult | undefined) =>
          ensureEventList(result?.active_events)
        );
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
        this.primeCategoryPeriodCache(query_options, filteredEvents);
        this.primeCategoryTimeByPeriod(query_options, filteredEvents, request_nonce);
        this.query_browser_completed(
          { domains: [], urls: [], titles: [], duration: 0 },
          request_nonce
        );

        if (include_stopwatch_data) {
          const stopwatch_events = aggregateEventsByDataKeys(
            (data || []).flatMap((result: DesktopEventsQueryResult | undefined) =>
              ensureEventList(result?.stopwatch_events)
            ),
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
      this.activity_cache_meta = null;

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
