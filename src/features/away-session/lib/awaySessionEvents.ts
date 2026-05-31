import moment from 'moment';

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

export function buildAwaySessionStopEvent(activeTimer: any, now = moment()) {
  const updatedEvent = JSON.parse(JSON.stringify(activeTimer));
  updatedEvent.data.running = false;
  updatedEvent.duration = now.diff(moment(updatedEvent.timestamp), 'seconds', true);
  return updatedEvent;
}

export function createAwaySessionSelectionReset() {
  return {
    selectedShortcutKey: '',
    customLabel: '',
  };
}
