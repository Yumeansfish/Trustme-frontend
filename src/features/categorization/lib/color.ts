import type { Category } from '~/features/categorization/lib/classes';
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

export function getColorFromCategory(c: Category): string {
  if (c && c.name && c.name.length > 0 && c.name[0] !== 'Uncategorized') {
    return getOrdinalPaletteColor(c.name.join(' > '));
  } else {
    return COLOR_UNCAT;
  }
}
