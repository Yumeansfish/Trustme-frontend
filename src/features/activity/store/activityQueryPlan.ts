import type { QueryOptions } from './activityTypes';
import {
  BROWSER_ACTIVITY_VISUALIZATIONS,
  CATEGORY_PERIOD_ACTIVITY_VISUALIZATIONS,
  QUERY_BACKED_ACTIVITY_VISUALIZATIONS,
  WINDOW_ACTIVITY_VISUALIZATIONS,
} from '~/features/activity/lib/visualization/activityVisualizationRegistry';

function getRequestedVisualizations(query_options: QueryOptions): string[] {
  if (!Array.isArray(query_options.requested_visualizations)) {
    return [];
  }

  return query_options.requested_visualizations.filter(type => typeof type === 'string');
}

export function filterQueryBackedActivityVisualizations(
  visualizations: string[] | undefined
): string[] {
  if (!Array.isArray(visualizations)) {
    return [];
  }

  return visualizations.filter(type => QUERY_BACKED_ACTIVITY_VISUALIZATIONS.has(type));
}

function hasRequestedVisualization(query_options: QueryOptions, candidates: Set<string>): boolean {
  const requestedVisualizations = getRequestedVisualizations(query_options);

  if (requestedVisualizations.length === 0) {
    return false;
  }

  return requestedVisualizations.some(type => candidates.has(type));
}

export function shouldQueryWindowData(query_options: QueryOptions): boolean {
  return hasRequestedVisualization(query_options, WINDOW_ACTIVITY_VISUALIZATIONS);
}

export function shouldQueryCategoryTimeByPeriod(query_options: QueryOptions): boolean {
  return hasRequestedVisualization(query_options, CATEGORY_PERIOD_ACTIVITY_VISUALIZATIONS);
}

export function shouldIncludeBrowserData(query_options: QueryOptions): boolean {
  return hasRequestedVisualization(query_options, BROWSER_ACTIVITY_VISUALIZATIONS);
}

export function shouldUseActivityDataFlow(query_options: QueryOptions): boolean {
  return getRequestedVisualizations(query_options).every(type =>
    QUERY_BACKED_ACTIVITY_VISUALIZATIONS.has(type)
  );
}
