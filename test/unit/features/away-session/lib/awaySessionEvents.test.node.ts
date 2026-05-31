import moment from 'moment';

import {
  buildAwaySessionStartEvent,
  buildAwaySessionStopEvent,
  createAwaySessionSelectionReset,
} from '~/features/away-session/lib/awaySessionEvents';

describe('awaySessionEvents', () => {
  test('buildAwaySessionStartEvent trims the label and stores it as category metadata', () => {
    const event = buildAwaySessionStartEvent('  Deep Work  ', new Date('2026-03-21T09:00:00.000Z'));

    expect(event).toEqual({
      timestamp: new Date('2026-03-21T09:00:00.000Z'),
      data: {
        running: true,
        label: 'Deep Work',
        $manual_away: true,
        $category: ['Deep Work'],
      },
    });
  });

  test('buildAwaySessionStopEvent clones the timer and computes elapsed duration', () => {
    const activeTimer = {
      timestamp: '2026-03-21T09:00:00.000Z',
      duration: 0,
      data: {
        running: true,
        label: 'Deep Work',
      },
    };

    const stopped = buildAwaySessionStopEvent(activeTimer, moment('2026-03-21T09:01:30.500Z'));

    expect(stopped.data.running).toBe(false);
    expect(stopped.duration).toBe(90.5);
    expect(activeTimer.data.running).toBe(true);
  });

  test('createAwaySessionSelectionReset clears shortcut selection state', () => {
    expect(createAwaySessionSelectionReset()).toEqual({
      selectedShortcutKey: '',
      customLabel: '',
    });
  });
});
