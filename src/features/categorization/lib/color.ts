import _ from 'lodash';
import * as d3 from 'd3';
import { loadCategoryClasses } from '~/features/categorization/lib/categoryPersistence';
import { matchCategoryAgainstTexts } from '~/features/categorization/lib/categoryRules';
import type { Category } from '~/features/categorization/lib/classes';
import type { IEvent, IBucket } from '~/shared/lib/interfaces';
import {
  CATEGORY_SCALE_PALETTE,
  CATEGORY_UNCATEGORIZED,
} from '~/features/categorization/lib/visualizationTokens';

// See here for examples:
//   https://bl.ocks.org/pstuffa/3393ff2711a53975040077b7453781a9
//

const rizePalette = CATEGORY_SCALE_PALETTE;

const scale = d3.scaleOrdinal(rizePalette);

// Needed to prewarm the color table
scale.domain(
  '0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20'.split(/, /)
);

function hashcode(str: string): number {
  let hash = 0;
  if (str.length === 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    const character = str.charCodeAt(i);
    hash = (hash << 5) - hash + character;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

export function getColorFromString(appname: string): string {
  appname = appname || '';
  appname = appname.toLowerCase();
  return scale(Math.abs(hashcode(appname) % rizePalette.length).toString());
}

const COLOR_UNCAT = CATEGORY_UNCATEGORIZED;

// TODO: Move into vuex?
export function getColorFromCategory(c: Category, _allCats: Category[]): string {
  if (c && c.name && c.name.length > 0 && c.name[0] !== 'Uncategorized') {
    return scale(Math.abs(hashcode(c.name.join(' > ')) % rizePalette.length).toString());
  } else {
    return COLOR_UNCAT;
  }
}

function getCategoryColorFromTexts(texts: Array<string | null | undefined>): string {
  // TODO: Don't load classes on every call
  const allCats = loadCategoryClasses();
  const c = matchCategoryAgainstTexts(texts, allCats);
  const fallbackLabel = texts.filter((text): text is string => typeof text === 'string').join('\n');

  if (c !== null) {
    return getColorFromCategory(c, allCats);
  } else {
    return fallbackColor(fallbackLabel);
  }
}

function getCategoryFromTexts(texts: Array<string | null | undefined>): Category | null {
  const allCats = loadCategoryClasses();
  return matchCategoryAgainstTexts(texts, allCats);
}

// TODO: Move into vuex?
export function getCategoryColorFromString(str: string): string {
  return getCategoryColorFromTexts([str]);
}

function fallbackColor(str: string): string {
  // Get fallback color
  // TODO: Fetch setting from somewhere better, where defaults are respected
  const useColorFallback =
    localStorage !== undefined ? localStorage.useColorFallback === 'true' : true;
  if (useColorFallback) {
    return getColorFromString(str);
  } else {
    return COLOR_UNCAT;
  }
}

export function getTitleAttr(bucket: { type?: string }, e: IEvent) {
  if (bucket.type == 'currentwindow') {
    return e.data.app;
  } else if (bucket.type == 'web.tab.current') {
    const domainRegex = /^.+:\/\/(?:www.)?([^/]+)/;
    const match = e.data.url.match(domainRegex);
    return match ? match[1] : e.data.url;
  } else if (bucket.type == 'afkstatus') {
    return e.data.status;
  } else if (bucket.type?.startsWith('app.editor')) {
    return _.last(e.data.file.split('/'));
  } else if (bucket.type?.startsWith('general.stopwatch')) {
    return e.data.label;
  } else {
    const title = e.data.title;
    if (title && typeof title === 'string') {
      return title;
    }

    const keys = Object.keys(e.data);
    if (keys.length === 1) {
      const val = e.data[keys[0]];
      if (typeof val === 'string') {
        return val.length > 50 ? val.slice(0, 50) : val;
      }
    }

    return '';
  }
}

export function getCategoryColorFromEvent(bucket: IBucket, e: IEvent) {
  if (bucket.type == 'currentwindow') {
    return getCategoryColorFromTexts([e.data.app, e.data.title]);
  } else if (bucket.type == 'web.tab.current') {
    return getCategoryColorFromTexts([e.data.title, e.data.url]);
  } else if (bucket.type == 'afkstatus') {
    return getColorFromString(e.data.status);
  } else if (bucket.type?.startsWith('app.editor')) {
    return getCategoryColorFromTexts([e.data.file]);
  } else if (bucket.type?.startsWith('general.stopwatch')) {
    return getCategoryColorFromTexts([e.data.label]);
  } else {
    return getColorFromString(getTitleAttr(bucket, e));
  }
}

export function getCategoryNameFromEvent(bucket: IBucket, e: IEvent): string | null {
  let category: Category | null = null;

  if (bucket.type == 'currentwindow') {
    category = getCategoryFromTexts([e.data.app, e.data.title]);
  } else if (bucket.type == 'web.tab.current') {
    category = getCategoryFromTexts([e.data.title, e.data.url]);
  } else if (bucket.type == 'afkstatus') {
    return e.data.status === 'not-afk' ? 'Active' : 'Idle';
  } else if (bucket.type?.startsWith('app.editor')) {
    category = getCategoryFromTexts([e.data.file]);
  } else if (bucket.type?.startsWith('general.stopwatch')) {
    category = getCategoryFromTexts([e.data.label]);
  }

  return category?.name?.[0] || null;
}
