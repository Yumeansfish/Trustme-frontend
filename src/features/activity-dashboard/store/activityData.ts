import { IEvent } from '~/shared/lib/interfaces';

import {
  TimePeriod,
  timeperiodToStr,
  timeperiodsHoursOfPeriod,
  timeperiodsDaysOfPeriod,
  timeperiodsMonthsOfPeriod,
} from '~/app/lib/timeperiod';

import type { ActivityPeriodMode, BrowserQueryResult, ExecutionRange } from './activityTypes';

function timeperiodsStrsHoursOfPeriod(timeperiod: TimePeriod): string[] {
  return timeperiodsHoursOfPeriod(timeperiod).map(timeperiodToStr);
}

function timeperiodsStrsDaysOfPeriod(timeperiod: TimePeriod): string[] {
  return timeperiodsDaysOfPeriod(timeperiod).map(timeperiodToStr);
}

function timeperiodsStrsMonthsOfPeriod(timeperiod: TimePeriod): string[] {
  return timeperiodsMonthsOfPeriod(timeperiod).map(timeperiodToStr);
}

export function buildExecutionQueryPeriods(timeperiod: TimePeriod): string[] {
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

export function ensureEventList(events: unknown): IEvent[] {
  return Array.isArray(events) ? [...events] : [];
}

export function ensureDuration(duration: unknown): number {
  return typeof duration === 'number' && Number.isFinite(duration) ? duration : 0;
}

export function parseExecutionRange(periods: string[]): ExecutionRange | null {
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

function shouldUseHourlyCategoryPeriods(
  timeperiod: TimePeriod,
  _periodMode?: ActivityPeriodMode
): boolean {
  const count = timeperiod.length[0];
  const resolution = timeperiod.length[1];
  return resolution.startsWith('day') && count === 1;
}

function buildCategoryPeriods(timeperiod: TimePeriod, periodMode?: ActivityPeriodMode): string[] {
  const count = timeperiod.length[0];
  const resolution = timeperiod.length[1];

  if (shouldUseHourlyCategoryPeriods(timeperiod, periodMode)) {
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

export function buildCompactSummarySnapshotPeriods(
  timeperiod: TimePeriod,
  periodMode?: ActivityPeriodMode
): string[] {
  const nowMs = Date.now();

  return buildCategoryPeriods(timeperiod, periodMode)
    .map(period => {
      const [startIso, endIso] = period.split('/');
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(endIso).getTime();

      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= nowMs) {
        return null;
      }

      const effectiveEndIso = endMs > nowMs ? new Date(nowMs).toISOString() : endIso;

      return `${startIso}/${effectiveEndIso}`;
    })
    .filter((period): period is string => Boolean(period));
}

export function buildCompactSummaryLogicalPeriods(
  timeperiod: TimePeriod,
  periodMode?: ActivityPeriodMode
): string[] {
  const nowMs = Date.now();

  return buildCategoryPeriods(timeperiod, periodMode).filter(period => {
    const [startIso, endIso] = period.split('/');
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    return Number.isFinite(startMs) && Number.isFinite(endMs) && startMs < nowMs;
  });
}

export function emptyBrowserResult(): BrowserQueryResult {
  return { domains: [], urls: [], titles: [] };
}
