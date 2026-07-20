import { ensureByPeriod } from '~/features/summary/lib/summaryData';

test('keeps valid category events and genuinely empty periods', () => {
  const value = { hourA: { cat_events: [{
    timestamp: '2026-03-01T10:00:00Z', duration: 60, data: { $category: ['Code'] },
  }] }, hourB: { cat_events: [] } };
  expect(ensureByPeriod(value)).toEqual(value);
  expect(ensureByPeriod({})).toEqual({});
});

test.each([null, [], 'bad', { hour: {} }, { hour: 'bad' }, { hour: { cat_events: null } }])(
  'rejects malformed periods %p', value => {
    expect(() => ensureByPeriod(value)).toThrow();
  }
);
