import { orderAwaySessionEvents } from '~/features/away-session/lib/awaySessionRuntime';

describe('awaySessionRuntime', () => {
  test('orderAwaySessionEvents keeps the newest event first', () => {
    expect(
      orderAwaySessionEvents([
        { timestamp: '2026-03-21T08:00:00.000Z' },
        { timestamp: '2026-03-21T10:00:00.000Z' },
      ])
    ).toEqual([
      { timestamp: '2026-03-21T10:00:00.000Z' },
      { timestamp: '2026-03-21T08:00:00.000Z' },
    ]);
  });
});
