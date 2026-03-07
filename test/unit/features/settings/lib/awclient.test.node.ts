const mockClientInstances: Array<{
  req: { defaults: { timeout: number } };
  options: { testing: boolean; baseURL: string };
}> = [];

jest.mock('aw-client', () => ({
  AWClient: jest.fn().mockImplementation((_name: string, options: { testing: boolean; baseURL: string }) => {
    const instance = {
      req: {
        defaults: {
          timeout: 0,
        },
      },
      options,
    };
    mockClientInstances.push(instance);
    return instance;
  }),
}));

describe('awclient helpers', () => {
  beforeEach(() => {
    mockClientInstances.length = 0;
    jest.resetModules();
  });

  it('throws an Error when getClient is called before initialization', async () => {
    const { getClient } = await import('~/app/lib/awclient');

    expect(() => getClient()).toThrow(
      new Error('Tried to get global AWClient before instantiating it!')
    );
  });

  it('reuses the singleton and configures request timeout', async () => {
    const { configureClient, createClient, getClient } = await import('~/app/lib/awclient');

    const client = createClient();

    expect(getClient()).toBe(client);
    expect(mockClientInstances).toHaveLength(1);
    expect(mockClientInstances[0]?.options).toEqual({
      testing: true,
      baseURL: '',
    });

    configureClient(42);

    expect(mockClientInstances[0]?.req.defaults.timeout).toBe(42000);
  });
});
