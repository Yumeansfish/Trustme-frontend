import { flushPromises, mount } from '@vue/test-utils';

import Timeline from '~/features/timeline/views/Timeline.vue';
import type { TimelineResponse } from '~/shared/contracts/timeline.generated';

const mockFetchTimeline = jest.fn();

jest.mock('~/features/timeline/lib/timelineClient', () => ({
  fetchTimeline: (...args: unknown[]) => mockFetchTimeline(...args),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(fulfil => {
    resolve = fulfil;
  });
  return { promise, resolve };
}

function response(eventCount: number): TimelineResponse {
  return {
    range_start: '2026-07-15T10:00:00.000Z',
    range_end: '2026-07-15T11:00:00.000Z',
    status: { event_count: eventCount, segments: [] },
    app_focus: { event_count: eventCount, segments: [] },
  };
}

describe('Timeline request ownership', () => {
  test('aborts and ignores an older response', async () => {
    const first = deferred<TimelineResponse>();
    const second = deferred<TimelineResponse>();
    mockFetchTimeline.mockReset().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const wrapper = mount(Timeline, {
      global: {
        mocks: {
          $route: { fullPath: '/timeline', query: {} },
          $router: { push: jest.fn().mockResolvedValue(undefined) },
        },
        stubs: {
          'aw-alert': true,
          icon: true,
          'ui-link': true,
          ThemeToggleButton: true,
          TimelineLaneCard: true,
        },
      },
    });
    await flushPromises();

    const secondRun = (wrapper.vm as any).refreshTimeline();
    expect(mockFetchTimeline.mock.calls[0][0].signal.aborted).toBe(true);

    second.resolve(response(2));
    await secondRun;
    first.resolve(response(1));
    await flushPromises();

    expect((wrapper.vm as any).statusLane.event_count).toBe(2);
    wrapper.unmount();
  });
});
