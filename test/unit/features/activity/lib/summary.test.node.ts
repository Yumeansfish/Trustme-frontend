import { JSDOM } from 'jsdom';

import summary from '~/features/activity-visualizations/lib/summary';

describe('summary', () => {
  test('updateSelection toggles active rows without rebuilding the list', () => {
    const dom = new JSDOM('<div id="root"></div>');
    const container = dom.window.document.getElementById('root') as HTMLElement;

    summary.create(container);
    summary.updateSummedEvents(
      container,
      [
        {
          timestamp: '2026-03-26T08:00:00.000Z',
          duration: 120,
          data: { app: 'Code' },
        },
        {
          timestamp: '2026-03-26T09:00:00.000Z',
          duration: 60,
          data: { app: 'Docs' },
        },
      ] as any,
      event => event.data.app,
      event => event.data.app,
      event => event.data.app,
      () => null,
      null,
      'Code'
    );

    const rows = Array.from(container.querySelectorAll('.aw-row'));
    expect(rows).toHaveLength(2);
    expect(rows[0].classList.contains('aw-row-active')).toBe(true);
    expect(rows[1].classList.contains('aw-row-active')).toBe(false);

    const firstRow = rows[0];
    const secondRow = rows[1];
    summary.updateSelection(container, 'Docs');

    const nextRows = Array.from(container.querySelectorAll('.aw-row'));
    expect(nextRows[0]).toBe(firstRow);
    expect(nextRows[1]).toBe(secondRow);
    expect(nextRows[0].classList.contains('aw-row-active')).toBe(false);
    expect(nextRows[1].classList.contains('aw-row-active')).toBe(true);
  });
});
