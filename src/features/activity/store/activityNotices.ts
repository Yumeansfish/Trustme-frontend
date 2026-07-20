import type { ActivityDataNotice } from './activityTypes';

export function formatActivityVisualizationType(type: string): string {
  return type
    .split('_')
    .map(part => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function buildActivityDataDegradedNotice(dtoNames: string[]): ActivityDataNotice {
  const uniqueDtoNames = [...new Set(dtoNames)];
  return {
    variant: 'danger',
    title: 'Activity data degraded',
    message:
      'Some activity data could not be loaded. This page is showing empty placeholders instead of running unsupported client-side queries.',
    items: uniqueDtoNames.map(name => `${name} unavailable`),
  };
}
