import { get_today } from '~/app/lib/time';

import type { DashboardResolvedScopeResult } from '~/features/activity-dashboard/store/activityTypes';
import { resolveDefaultViewId } from '~/features/activity-layouts/lib/activityViewCatalog';

export type ActivityRedirectOutcome =
  | {
      kind: 'redirect';
      path: string;
    }
  | {
      kind: 'empty';
      reason: 'missing-hosts' | 'load-failed';
      title: string;
      message: string;
    };

export function resolveActivityRedirectOutcome({
  activityScope,
  date = get_today(),
}: {
  activityScope: DashboardResolvedScopeResult | null;
  date?: string;
}): ActivityRedirectOutcome {
  const scope = activityScope?.group_name || null;

  if (scope) {
    const viewId = resolveDefaultViewId();
    return {
      kind: 'redirect',
      path: `/activity/${encodeURIComponent(scope)}/day/${date}/view/${encodeURIComponent(viewId)}`,
    };
  }

  if (activityScope === null) {
    return {
      kind: 'empty',
      reason: 'load-failed',
      title: 'Activity could not load its MacBook scope',
      message:
        'The app could not get the Activity scope from the backend. Retry, or inspect buckets directly while the backend settles down.',
    };
  }

  return {
    kind: 'empty',
    reason: 'missing-hosts',
    title: 'Activity needs watcher data before it can open',
    message:
      'No complete window and AFK watcher pair exists yet. Open buckets to inspect the raw watcher data.',
  };
}
