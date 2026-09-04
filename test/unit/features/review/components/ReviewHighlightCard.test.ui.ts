import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import ReviewHighlightCard from '~/features/review/components/ReviewHighlightCard.vue';
import { parseTimelineFixedRange } from '~/features/timeline/lib/timelineViewState';
import type { ReviewHighlight } from '~/shared/contracts/review.generated';

const highlight: ReviewHighlight = {
  id: 'highlight-1',
  filename: 'highlight.mp4',
  date: '2026-09-04',
  recorded_at: '2026-09-04T13:42:15+02:00',
  video_url: '/api/review/highlights/highlight.mp4',
};

describe('ReviewHighlightCard', () => {
  test('opens Timeline at the video timestamp and links back to the same Review day', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/review/:date', component: { template: '<div />' } },
        { path: '/timeline', component: { template: '<div />' } },
      ],
    });
    const reviewPath = '/review/2026-09-04?scope=laptop';
    await router.push(reviewPath);
    await router.isReady();
    const wrapper = mount(ReviewHighlightCard, {
      props: { highlight },
      global: { plugins: [router] },
    });

    expect(wrapper.get('video').attributes('src')).toBe(highlight.video_url);
    expect(wrapper.get('a').text()).toBe('View the timeline at this moment');
    await wrapper.get('a').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/timeline');
    expect(router.currentRoute.value.query).toEqual({
      ts: highlight.recorded_at,
      seconds: '60',
      scope: 'laptop',
      returnTo: reviewPath,
      returnLabel: 'Review',
    });
    const range = parseTimelineFixedRange(router.currentRoute.value.query);
    expect(range?.map(time => time.toISOString())).toEqual([
      '2026-09-04T11:41:45.000Z',
      '2026-09-04T11:42:45.000Z',
    ]);
    wrapper.unmount();
  });
});
