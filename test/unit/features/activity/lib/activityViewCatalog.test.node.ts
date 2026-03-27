import { defaultViews, resolveDefaultViewId } from '~/features/activity-layouts/lib/activityViewCatalog';

describe('activityViewCatalog', () => {
  test('resolves the default fixed activity view id', () => {
    expect(resolveDefaultViewId(defaultViews)).toBe('summary');
    expect(resolveDefaultViewId([])).toBe('summary');
  });
});
