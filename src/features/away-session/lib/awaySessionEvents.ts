import moment from 'moment';
import type { AwaySessionEvent } from './awaySessionRuntime';

export function buildAwaySessionStartEvent(label: string, timestamp = new Date()) {
  const normalizedLabel = (label || '').trim();

  return {
    timestamp,
    data: {
      running: true,
      label: normalizedLabel,
      $manual_away: true,
      $category: [normalizedLabel],
    },
  };
}

export function buildAwaySessionStopEvent(
  activeTimer: AwaySessionEvent,
  now = moment()
): AwaySessionEvent {
  const updatedEvent: AwaySessionEvent = {
    ...activeTimer,
    data: { ...activeTimer.data },
  };
  if (updatedEvent.data) {
    updatedEvent.data.running = false;
  }
  updatedEvent.duration = now.diff(moment(updatedEvent.timestamp), 'seconds', true);
  return updatedEvent;
}

export function createAwaySessionSelectionReset() {
  return {
    selectedShortcutKey: '',
    customLabel: '',
  };
}
