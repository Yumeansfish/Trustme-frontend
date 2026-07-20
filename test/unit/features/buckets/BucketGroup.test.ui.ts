import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BucketGroup from '~/features/buckets/views/BucketGroup.vue';
import Button from '~/shared/ui/Button.vue';

const mockFetchBuckets = jest.fn();
const mockFetchEvents = jest.fn();
jest.mock('~/features/buckets/lib/bucketsClient', () => ({
  fetchBuckets: () => mockFetchBuckets(),
  fetchBucketEvents: (...args: unknown[]) => mockFetchEvents(...args),
}));

const date = '2026-09-07';
const bucket = {
  id: 'aw-watcher-window_test', type: 'currentwindow', hostname: 'test', data: {},
  first_seen: `${date}T09:00:00+02:00`, last_updated: `${date}T12:00:00+02:00`,
};

beforeEach(() => {
  setActivePinia(createPinia());
  mockFetchBuckets.mockResolvedValue([bucket]);
  mockFetchEvents.mockResolvedValue(Array.from({ length: 125 }, (_, index) => ({
    id: index, timestamp: new Date(Date.UTC(2026, 8, 7, 7, index)).toISOString(),
    duration: 60, data: { app: 'Editor', title: `Window ${index}` },
  })));
});

async function openGroup() {
  const wrapper = mount(BucketGroup, {
    props: { groupKey: 'aw-watcher-window', date },
    global: {
      components: { 'ui-button': Button },
      stubs: {
        DateNavigator: true, ThemeToggleButton: true, icon: true,
        'ui-link': { template: '<a><slot /></a>' }, 'aw-alert': true,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

test('lets the event panel fill the viewport without the old fixed-height list cap', async () => {
  const wrapper = await openGroup();
  const panel = wrapper.get('section');
  expect(panel.classes()).toEqual(expect.arrayContaining(['flex', 'flex-1', 'min-h-0']));
  const list = wrapper.get('[aria-label="Raw events"]');
  expect(list.classes()).toEqual(expect.arrayContaining(['flex-1', 'min-h-0', 'overflow-y-auto']));
  expect(list.classes()).not.toContain('aw-list-scroll');
  expect(list.findAll('li')).toHaveLength(100);
  expect(wrapper.text()).toContain('Showing 1–100 of 125 events');
});

test('keeps pagination and starts each new page at the top', async () => {
  const wrapper = await openGroup();
  const list = wrapper.get<HTMLUListElement>('[aria-label="Raw events"]');
  list.element.scrollTop = 400;
  const next = wrapper.findAll('button').find(button => button.text() === 'Next');
  await next!.trigger('click');
  await flushPromises();
  expect(list.element.scrollTop).toBe(0);
  expect(list.findAll('li')).toHaveLength(25);
  expect(wrapper.text()).toContain('Showing 101–125 of 125 events');
  const previous = wrapper.findAll('button').find(button => button.text() === 'Previous');
  await previous!.trigger('click');
  expect(list.findAll('li')).toHaveLength(100);
});

test('raw-data Open routes use the app viewport layout', async () => {
  Object.assign(globalThis, { __TRUSTME_DEV_SERVER__: false });
  try {
    const { default: router } = await import('~/app/router');
    expect(router.resolve(`/buckets/group/aw-watcher-window/${date}`).meta.viewportPage).toBe(true);
    expect(router.resolve('/buckets').meta.viewportPage).toBeUndefined();
  } finally {
    Reflect.deleteProperty(globalThis, '__TRUSTME_DEV_SERVER__');
  }
});
