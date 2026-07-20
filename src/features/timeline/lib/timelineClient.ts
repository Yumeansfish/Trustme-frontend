import { getClient } from '~/app/lib/awclient';
import type {
  TimelineLane,
  TimelineResponse,
  TimelineSegment,
} from '~/shared/contracts/timeline.generated';

const TIMELINE_ENDPOINT = '/0/dashboard/timeline';

function normalizeSegment(value: unknown): TimelineSegment | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.key !== 'string' ||
    typeof raw.label !== 'string' ||
    typeof raw.start !== 'string' ||
    typeof raw.end !== 'string'
  ) {
    return null;
  }
  return {
    key: raw.key,
    label: raw.label,
    detail: typeof raw.detail === 'string' ? raw.detail : '',
    category: typeof raw.category === 'string' ? raw.category : null,
    source: typeof raw.source === 'string' ? raw.source : '',
    start: raw.start,
    end: raw.end,
    clipped_start: raw.clipped_start === true,
    clipped_end: raw.clipped_end === true,
    variant: raw.variant === 'soft' ? 'soft' : 'primary',
  };
}

function normalizeLane(value: unknown): TimelineLane {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const segments = Array.isArray(raw.segments)
    ? raw.segments.map(normalizeSegment).filter((item): item is TimelineSegment => item !== null)
    : [];
  return {
    event_count:
      typeof raw.event_count === 'number' && Number.isFinite(raw.event_count)
        ? raw.event_count
        : segments.length,
    segments,
  };
}

export async function fetchTimeline({
  start,
  end,
  signal,
}: {
  start: Date;
  end: Date;
  signal?: AbortSignal;
}): Promise<TimelineResponse> {
  const response = await getClient().req.post(
    TIMELINE_ENDPOINT,
    {
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    },
    signal ? { signal } : undefined
  );
  return {
    range_start:
      typeof response.data?.range_start === 'string' ? response.data.range_start : start.toISOString(),
    range_end:
      typeof response.data?.range_end === 'string' ? response.data.range_end : end.toISOString(),
    status: normalizeLane(response.data?.status),
    app_focus: normalizeLane(response.data?.app_focus),
  };
}
