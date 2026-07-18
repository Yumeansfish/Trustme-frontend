describe('development route isolation', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__TRUSTME_DEV_SERVER__');
    jest.resetModules();
  });

  test.each([false, true])('dev server flag %s controls /dev registration', async enabled => {
    Object.assign(globalThis, { __TRUSTME_DEV_SERVER__: enabled });
    const { default: router } = await import('~/app/router');
    expect(router.getRoutes().some(route => route.path === '/dev')).toBe(enabled);
    expect(router.resolve('/dev').matched[0].path).toBe(
      enabled ? '/dev' : '/:pathMatch(.*)*'
    );
  });
});
