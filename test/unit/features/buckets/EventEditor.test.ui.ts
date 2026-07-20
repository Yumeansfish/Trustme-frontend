import { flushPromises, mount } from '@vue/test-utils';

import EventEditor from '~/features/buckets/components/EventEditor.vue';

const mockClient = {
  getEvent: jest.fn(),
  replaceEvent: jest.fn(),
  deleteEvent: jest.fn(),
};

jest.mock('~/app/lib/awclient', () => ({
  getClient: () => mockClient,
}));

const buttonStub = {
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
};

describe('EventEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.getEvent.mockResolvedValue({
      id: 7,
      timestamp: new Date('2026-07-15T10:00:00.000Z'),
      duration: 60,
      data: { app: 'Code' },
    });
  });

  test('does not report a save before the backend accepts it', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockClient.replaceEvent.mockRejectedValue(new Error('write failed'));
    const wrapper = mount(EventEditor, {
      props: {
        bucketId: 'aw-watcher-window_test',
        event: {
          id: 7,
          timestamp: '2026-07-15T10:00:00.000Z',
          duration: 60,
          data: { app: 'Code' },
        },
        open: true,
      },
      global: {
        stubs: {
          teleport: true,
          icon: true,
          'aw-alert': { template: '<div><slot /></div>' },
          'ui-button': buttonStub,
          'ui-input': { template: '<input />' },
          'ui-checkbox': { template: '<input type="checkbox" />' },
          'ui-textarea': { template: '<textarea />' },
        },
      },
    });
    await flushPromises();

    const saveButton = wrapper.findAll('button').find(button => button.text().includes('Save'));
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');
    await flushPromises();

    expect(mockClient.replaceEvent).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('saved')).toBeUndefined();
    expect(wrapper.emitted('update:open')).toBeUndefined();
    expect(wrapper.text()).toContain('No changes were applied');
    consoleError.mockRestore();
  });
});
