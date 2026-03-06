import _ from 'lodash';
import { Category, matchString, loadClasses } from './classes';
import * as d3 from 'd3';
import { IEvent, IBucket } from './interfaces';

// See here for examples:
//   https://bl.ocks.org/pstuffa/3393ff2711a53975040077b7453781a9
//

const rizePalette = [
  '#5E5CE6', // Primary Indigo
  '#6C6AEB',
  '#7A78F0',
  '#8886F5',
  '#9694FA',
  '#A4A2FF',
  '#4E4CC6',
  '#3E3CA6',
];

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

const COLOR_UNCAT = '#E5E5EA'; // A nice grey for uncategorized

// TODO: Move into vuex?
export function getColorFromCategory(c: Category, _allCats: Category[]): string {
  if (c && c.name && c.name.length > 0 && c.name[0] !== 'Uncategorized') {
    return scale(Math.abs(hashcode(c.name.join(' > ')) % rizePalette.length).toString());
  } else {
    return COLOR_UNCAT;
  }
}

// TODO: Move into vuex?
export function getCategoryColorFromString(str: string): string {
  // TODO: Don't load classes on every call
  const allCats = loadClasses();
  const c = matchString(str, allCats);
  if (c !== null) {
    return getColorFromCategory(c, allCats);
  } else {
    return fallbackColor(str);
  }
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
    // using linebreak and "m" regex flag to make `$` and `^` work
    return getCategoryColorFromString(e.data.app + '\n' + e.data.title);
  } else if (bucket.type == 'web.tab.current') {
    // same as above
    return getCategoryColorFromString(e.data.title + '\n' + e.data.url);
  } else if (bucket.type == 'afkstatus') {
    return getColorFromString(e.data.status);
  } else if (bucket.type?.startsWith('app.editor')) {
    return getCategoryColorFromString(e.data.file);
  } else if (bucket.type?.startsWith('general.stopwatch')) {
    return getCategoryColorFromString(e.data.label);
  } else {
    return getColorFromString(getTitleAttr(bucket, e));
  }
}
