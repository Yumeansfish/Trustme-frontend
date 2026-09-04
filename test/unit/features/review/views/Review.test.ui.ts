import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import Review from '~/features/review/views/Review.vue';
import type { ReviewHighlight } from '~/shared/contracts/review.generated';

const mockFetchReview = jest.fn();
const mockRequestReviewSync = jest.fn();
jest.mock('~/features/review/lib/reviewClient', () => ({
  fetchReview: (...args: unknown[]) => mockFetchReview(...args),
  requestReviewSync: (...args: unknown[]) => mockRequestReviewSync(...args),
}));

const date = '2026-09-04';
const highlights: ReviewHighlight[] = Array.from({ length: 4 }, (_, index) => ({
  id: `highlight-${index}`,
  filename: `highlight-${index}.mp4`,
  date,
  recorded_at: `${date}T${10 + index}:00:00+02:00`,
  video_url: `/api/0/review/highlights/highlight-${index}.mp4`,
}));

async function mountReview() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/review/:date', component: Review },
      { path: '/timeline', component: { template: '<div />' } },
    ],
  });
  await router.push(`/review/${date}`);
  await router.isReady();
  const wrapper = mount(Review, {
    props: { date },
    global: {
      plugins: [router],
      stubs: { DateNavigator: true, ThemeToggleButton: true, 'aw-alert': true },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('Review video-only history', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchReview.mockReset();
    mockRequestReviewSync.mockReset();
  });

  afterEach(() => {
    expect(mockRequestReviewSync).not.toHaveBeenCalled();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('keeps all four videos, their Timeline links and video calendar dates', async () => {
    mockFetchReview.mockResolvedValue({ available_dates: [date], highlights });
    const wrapper = await mountReview();

    expect(mockFetchReview).toHaveBeenCalledWith(date);
    expect(wrapper.findAll('video')).toHaveLength(4);
    expect(wrapper.findAll('.aw-review-highlight-actions a')).toHaveLength(4);
    expect(wrapper.findComponent({ name: 'DateNavigator' }).props('availableDates')).toEqual([date]);
    expect(wrapper.text()).not.toContain('Self-reports');
    expect(wrapper.text()).not.toContain('StreamDeck');
    wrapper.unmount();
  });

  test('shows the video empty state without reviving old self-reports', async () => {
    mockFetchReview.mockResolvedValue({
      available_dates: [],
      highlights: [],
      self_reports: [{ id: 'legacy-session', date, answers: [] }],
    });
    const wrapper = await mountReview();

    expect(wrapper.text()).toContain('No highlights for this day.');
    expect(wrapper.findAll('video')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('Self-reports');
    wrapper.unmount();
  });

  test('shows newly downloaded videos and dates without re-entering Review', async () => {
    mockFetchReview.mockResolvedValue({ available_dates: [], highlights: [] });
    const wrapper = await mountReview();
    expect(wrapper.text()).toContain('No highlights for this day.');
    mockFetchReview.mockResolvedValue({ available_dates: [date], highlights });

    jest.advanceTimersByTime(5_000);
    await flushPromises();
    expect(mockFetchReview).toHaveBeenCalledTimes(2);
    expect(wrapper.findAll('video')).toHaveLength(4);
    expect(wrapper.findComponent({ name: 'DateNavigator' }).props('availableDates')).toEqual([date]);
    expect(wrapper.text()).not.toContain('No highlights for this day.');
    wrapper.unmount();
  });

  test('keeps the playing video mounted when more highlights arrive', async () => {
    mockFetchReview.mockResolvedValue({ available_dates: [date], highlights: highlights.slice(0, 1) });
    const wrapper = await mountReview();
    const video = wrapper.get('video').element as HTMLVideoElement;
    video.currentTime = 19;
    mockFetchReview.mockResolvedValue({
      available_dates: [date], highlights: highlights.map(highlight => ({ ...highlight })),
    });
    jest.advanceTimersByTime(5_000);
    await flushPromises();

    expect(wrapper.findAll('video')).toHaveLength(4);
    expect(wrapper.get('video').element).toBe(video);
    expect(video.currentTime).toBe(19);
    expect(wrapper.text()).not.toContain('Loading review');
    wrapper.unmount();
  });

  test('pauses local refreshes in a hidden tab and refreshes when it becomes visible', async () => {
    mockFetchReview.mockResolvedValue({ available_dates: [], highlights: [] });
    const wrapper = await mountReview();
    const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    jest.advanceTimersByTime(30_000);
    window.dispatchEvent(new Event('focus'));
    await flushPromises();
    expect(mockFetchReview).toHaveBeenCalledTimes(1);

    hidden.mockReturnValue(false);
    mockFetchReview.mockResolvedValue({ available_dates: [date], highlights });
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(wrapper.findAll('video')).toHaveLength(4);
    wrapper.unmount();
  });

  test('coalesces refreshes and keeps the selected date when the index gains other dates', async () => {
    mockFetchReview.mockResolvedValue({ available_dates: [], highlights: [] });
    const wrapper = await mountReview();
    let resolve!: (value: unknown) => void;
    mockFetchReview.mockReturnValue(new Promise(done => { resolve = done; }));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    jest.advanceTimersByTime(15_000);
    expect(mockFetchReview).toHaveBeenCalledTimes(2);
    resolve({ available_dates: ['2026-09-03'], highlights: [] });
    await flushPromises();
    expect(wrapper.vm.$route.path).toBe(`/review/${date}`);
    expect(wrapper.findComponent({ name: 'DateNavigator' }).props('availableDates')).toEqual(['2026-09-03']);
    wrapper.unmount();
  });

  test('keeps existing videos on refresh failure and recovers on the next refresh', async () => {
    mockFetchReview.mockResolvedValue({ available_dates: [date], highlights: highlights.slice(0, 1) });
    const wrapper = await mountReview();
    const video = wrapper.get('video').element;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFetchReview.mockRejectedValueOnce(new Error('local backend restarting'));
    window.dispatchEvent(new Event('focus'));
    await flushPromises();
    expect(wrapper.get('video').element).toBe(video);
    expect(wrapper.findComponent({ name: 'DateNavigator' }).props('availableDates')).toEqual([date]);

    mockFetchReview.mockResolvedValue({ available_dates: [date], highlights });
    jest.advanceTimersByTime(5_000);
    await flushPromises();
    expect(wrapper.findAll('video')).toHaveLength(4);
    expect(wrapper.find('aw-alert-stub').exists()).toBe(false);
    wrapper.unmount();
  });

  test('discards an in-flight refresh after switching dates', async () => {
    mockFetchReview.mockResolvedValue({ available_dates: [date], highlights });
    const wrapper = await mountReview();
    let resolveOld!: (value: unknown) => void;
    mockFetchReview.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    window.dispatchEvent(new Event('focus'));
    const nextDate = '2026-09-05';
    mockFetchReview.mockResolvedValue({ available_dates: [date, nextDate], highlights: [] });
    await wrapper.setProps({ date: nextDate });
    await flushPromises();
    resolveOld({ available_dates: [date], highlights });
    await flushPromises();
    expect(wrapper.findAll('video')).toHaveLength(0);
    expect(wrapper.findComponent({ name: 'DateNavigator' }).props('availableDates')).toEqual([date, nextDate]);
    wrapper.unmount();
  });

  test('stops refreshing and ignores pending responses after leaving Review', async () => {
    mockFetchReview.mockResolvedValue({ available_dates: [], highlights: [] });
    const wrapper = await mountReview();
    const review = wrapper.vm;
    let resolve!: (value: unknown) => void;
    mockFetchReview.mockReturnValue(new Promise(done => { resolve = done; }));
    window.dispatchEvent(new Event('focus'));
    wrapper.unmount();
    expect(jest.getTimerCount()).toBe(0);
    resolve({ available_dates: [date], highlights });
    await flushPromises();
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    jest.advanceTimersByTime(30_000);
    expect(mockFetchReview).toHaveBeenCalledTimes(2);
    expect(review.highlights).toEqual([]);
  });
});
