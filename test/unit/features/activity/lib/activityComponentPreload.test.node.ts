import { resolveActivityViewPreloadNames } from '~/features/activity-layouts/lib/activityComponentPreload';

describe('activityComponentPreload', () => {
  test('always preloads selectable visualization shell and relevant summary components', () => {
    expect(resolveActivityViewPreloadNames(null)).toEqual(['selectable']);

    expect(
      resolveActivityViewPreloadNames({
        elements: [
          { type: 'timeline_barchart' },
          { type: 'category_donut' },
          { type: 'top_categories' },
          { type: 'top_apps' },
        ],
      } as any)
    ).toEqual(['selectable', 'timeline', 'donut', 'summary']);
  });

  test('deduplicates loader names across repeated visualization kinds', () => {
    expect(
      resolveActivityViewPreloadNames({
        elements: [{ type: 'top_apps' }, { type: 'top_categories' }, { type: 'top_urls' }],
      } as any)
    ).toEqual(['selectable', 'summary']);
  });
});
