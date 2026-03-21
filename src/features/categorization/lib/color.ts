import _ from 'lodash';
import { loadCategoryClasses } from '~/features/categorization/lib/categoryPersistence';
import { matchCategoryAgainstTexts } from '~/features/categorization/lib/categoryRules';
import type { Category } from '~/features/categorization/lib/classes';
import type { IEvent, IBucket } from '~/shared/lib/interfaces';
import {
  CATEGORY_SCALE_PALETTE,
  CATEGORY_UNCATEGORIZED,
} from '~/features/categorization/lib/visualizationTokens';

const rizePalette = CATEGORY_SCALE_PALETTE;

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

function getOrdinalPaletteColor(label: string): string {
  const paletteIndex = Math.abs(hashcode(label)) % rizePalette.length;
  return rizePalette[paletteIndex];
}

export function getColorFromString(appname: string): string {
  appname = appname || '';
  appname = appname.toLowerCase();
  return getOrdinalPaletteColor(appname);
}

const COLOR_UNCAT = CATEGORY_UNCATEGORIZED;

// TODO: Move into vuex?
export function getColorFromCategory(c: Category, _allCats: Category[]): string {
  if (c && c.name && c.name.length > 0 && c.name[0] !== 'Uncategorized') {
    return getOrdinalPaletteColor(c.name.join(' > '));
  } else {
    return COLOR_UNCAT;
  }
}

function getCategoryColorFromTexts(texts: Array<string | null | undefined>): string {
  // TODO: Don't load classes on every call
  const allCats = loadCategoryClasses();
  const c = matchCategoryAgainstTexts(texts, allCats);

  if (c !== null) {
    return getColorFromCategory(c, allCats);
  } else {
    return COLOR_UNCAT;
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
    return e.data.status === 'not-afk' ? 'active' : 'AFK';
  } else if (bucket.type?.startsWith('app.editor')) {
    category = getCategoryFromTexts([e.data.file]);
  } else if (bucket.type?.startsWith('general.stopwatch')) {
    category = getCategoryFromTexts([e.data.label]);
  }

  return category?.name?.[0] || null;
}
