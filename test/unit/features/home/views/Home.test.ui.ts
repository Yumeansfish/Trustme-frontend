import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, nextTick, reactive } from 'vue';

const fetchDailyCheckIns = jest.fn();
const loadInsights = jest.fn();
const drawAttention = jest.fn();
const createDailyCheckIn = jest.fn();

jest.mock('~/features/daily-check-in/lib/dailyCheckInClient', () => ({
  createDailyCheckIn: (...args: unknown[]) => createDailyCheckIn(...args),
  fetchDailyCheckIns: (...args: unknown[]) => fetchDailyCheckIns(...args),
}));

import HomeView from '~/features/home/views/Home.vue';

function checkinResponse(day = '2026-08-31', session = 'morning', checked = false) {
  return {
    checkins: checked ? [{ checkin_date: day, session, checked_at: `${day}T09:00:00+02:00`,
      inference_due_at: null, session_ends_at: null }] : [],
    current_date: day, current_session: session,
    checkin_closes_at: `${day}T${session === 'morning' ? '10' : '15'}:00:00+02:00`,
  };
}

const DateNavigatorStub = defineComponent({
  name: 'DateNavigator',
  props: {
    markedDates: { type: Array, default: () => [] },
    modelValue: { type: String, default: '' },
  },
  template: '<div data-test="home-calendar"></div>',
});

const InsightsContentStub = defineComponent({
  name: 'InsightsContent',
  props: {
    date: { type: String, default: '' },
    forceEmpty: { type: Boolean, default: false },
    importantOnly: { type: Boolean, default: false },
  },
  methods: {
    load: (...args: unknown[]) => loadInsights(...args),
    drawAttentionToFirstPendingFeedback: (...args: unknown[]) => drawAttention(...args),
  },
  template: '<div data-test="insights-content"></div>',
});

function mountHome(route = reactive({ query: {} as Record<string, string> })) {
  return mount(HomeView, {
    global: {
      mocks: {
        $route: route,
        $router: { replace: jest.fn() },
      },
      stubs: {
        DailyCheckInCard: true,
        DateNavigator: DateNavigatorStub,
        Icon: true,
        InsightsContent: InsightsContentStub,
        OverallWellbeingCard: true,
        PrivacyControlCard: true,
        QuestionnaireNotificationTestButton: true,
        QuestionnaireTodoCard: true,
        RouterLink: { template: '<a><slot /></a>' },
        ThemeToggleButton: true,
        UiButton: { template: '<button><slot /></button>' },
      },
    },
  });
}

describe('Home insight calendar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-31T10:14:00+02:00'));
    fetchDailyCheckIns.mockReset();
    createDailyCheckIn.mockReset();
    loadInsights.mockClear();
    drawAttention.mockClear();
    fetchDailyCheckIns.mockResolvedValue(checkinResponse());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('reloads the same-day results when a suggestion popup reuses the Home tab', async () => {
    const route = reactive({ query: {} as Record<string, string> });
    const wrapper = mountHome(route);
    await flushPromises();
    loadInsights.mockClear();
    drawAttention.mockClear();
    route.query = { insights: '1', date: '2026-08-31', period: '0859-0959' };
    await nextTick();
    expect(loadInsights).toHaveBeenCalledWith(true);
    (wrapper.vm as InstanceType<typeof HomeView>).handlePendingFeedbackChange({
      count: 0, error: false, loading: false,
    });
    await nextTick();
    expect(drawAttention).toHaveBeenCalledWith('0859-0959', true);
    wrapper.unmount();
  });

  test('drives Insights from the selected day and stores historical dates', async () => {
    const wrapper = mountHome();
    await flushPromises();

    const insights = wrapper.findComponent(InsightsContentStub);
    expect(insights.props('date')).toBe('2026-08-31');

    (wrapper.vm as InstanceType<typeof HomeView>).calendarDate = '2026-08-30';
    await nextTick();
    expect(insights.props('date')).toBe('2026-08-30');

    const home = wrapper.vm as InstanceType<typeof HomeView>;
    home.handleInsightsLoaded({
      availableDates: ['2026-08-28', '2026-08-30'],
      resolvedDate: '2026-08-30',
      reports: [],
    });
    await wrapper.setData({ checkInDates: ['2026-08-29'] });

    expect(home.checkInDates).toEqual(['2026-08-29']);
    expect(home.insightDates).toEqual(['2026-08-28', '2026-08-30']);
    wrapper.unmount();
  });

  test('rolls today, calendar, check-in and pending feedback over at local midnight', async () => {
    jest.setSystemTime(new Date(2026, 8, 5, 23, 59));
    fetchDailyCheckIns.mockResolvedValueOnce(checkinResponse('2026-09-05', 'afternoon', true));
    fetchDailyCheckIns.mockResolvedValue(checkinResponse('2026-09-06'));
    const wrapper = mountHome();
    await flushPromises();
    const home = wrapper.vm as InstanceType<typeof HomeView>;
    home.handlePendingFeedbackChange({ count: 2, error: false, loading: false });
    expect(home.currentCheckIn).toBeTruthy();

    jest.advanceTimersByTime(60_000);
    await flushPromises();
    expect(home.today).toBe('2026-09-06');
    expect(home.calendarDate).toBe('2026-09-06');
    expect(home.currentCheckIn).toBeUndefined();
    expect(home.pendingFeedbackCount).toBe(0);
    expect(wrapper.findComponent(DateNavigatorStub).attributes('max')).toBe('2026-09-06');
    expect(wrapper.findComponent(InsightsContentStub).props('date')).toBe('2026-09-06');
    expect(fetchDailyCheckIns).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  test.each(['focus', 'visibilitychange'])('catches up after sleep on %s', async event => {
    const wrapper = mountHome();
    await flushPromises();
    // Jump several days without executing the browser's suspended timers.
    jest.setSystemTime(new Date(2026, 8, 3, 11));
    const surface = event === 'focus' ? window : document;
    surface.dispatchEvent(new Event(event));
    await flushPromises();
    const home = wrapper.vm as InstanceType<typeof HomeView>;
    expect(home.today).toBe('2026-09-03');
    expect(home.calendarDate).toBe('2026-09-03');
    expect(fetchDailyCheckIns).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  test.each([[2, 29], [9, 25]])('uses local midnight on DST transition %s/%s', async (month, day) => {
    const start = new Date(2026, month, day);
    const end = new Date(2026, month, day + 1);
    jest.setSystemTime(start);
    const wrapper = mountHome();
    await flushPromises();
    const home = wrapper.vm as InstanceType<typeof HomeView>;
    const originalDate = home.today;
    jest.advanceTimersByTime(end.getTime() - start.getTime() - 1);
    await nextTick();
    expect(home.today).toBe(originalDate);
    jest.advanceTimersByTime(1);
    await flushPromises();
    expect(home.today).not.toBe(originalDate);
    expect(home.calendarDate).toBe(home.today);
    wrapper.unmount();
  });

  test('ignores an older check-in response after resuming the page', async () => {
    let resolveInitial!: (value: unknown) => void;
    fetchDailyCheckIns.mockReturnValueOnce(new Promise(resolve => { resolveInitial = resolve; }));
    const wrapper = mountHome();
    fetchDailyCheckIns.mockResolvedValue(checkinResponse('2026-08-31', 'morning', true));
    window.dispatchEvent(new Event('focus'));
    await flushPromises();
    resolveInitial({ checkins: [] });
    await flushPromises();
    expect((wrapper.vm as InstanceType<typeof HomeView>).currentCheckIn).toBeTruthy();
    wrapper.unmount();
  });

  test('keeps a historical calendar selection when the day changes', async () => {
    const wrapper = mountHome();
    await flushPromises();
    await wrapper.setData({ calendarDate: '2026-08-29' });
    jest.setSystemTime(new Date(2026, 8, 1, 9));
    window.dispatchEvent(new Event('focus'));
    await flushPromises();
    const home = wrapper.vm as InstanceType<typeof HomeView>;
    expect(home.today).toBe('2026-09-01');
    expect(home.calendarDate).toBe('2026-08-29');
    expect(home.pendingFeedbackCount).toBe(0);
    expect(home.pendingFeedbackLoading).toBe(false);
    wrapper.unmount();
  });

  test('accepts next-day questionnaire links even before a focus event arrives', async () => {
    const route = reactive({ query: {} as Record<string, string> });
    const wrapper = mountHome(route);
    await flushPromises();
    jest.setSystemTime(new Date(2026, 8, 1, 11));
    route.query = { todo: '1', date: '2026-09-01', period: '0859-0959' };
    await nextTick();
    const home = wrapper.vm as InstanceType<typeof HomeView>;
    home.handlePendingFeedbackChange({ count: 2, error: false, loading: false });
    await nextTick();
    expect(home.today).toBe('2026-09-01');
    expect(home.pendingFeedbackCount).toBe(2);
    expect(drawAttention).toHaveBeenCalledWith('0859-0959', false);
    wrapper.unmount();
  });

  test('opens a separate afternoon check-in at noon without resetting the morning', async () => {
    jest.setSystemTime(new Date(2026, 7, 31, 11, 59, 59));
    const morning = checkinResponse('2026-08-31', 'morning', true);
    fetchDailyCheckIns.mockResolvedValueOnce(morning);
    fetchDailyCheckIns.mockResolvedValue({ ...morning, current_session: 'afternoon',
      session_ends_at: '2026-08-31T17:00:00+02:00' });
    const wrapper = mountHome();
    await flushPromises();
    const home = wrapper.vm as InstanceType<typeof HomeView>;
    expect(home.currentCheckIn).toBeTruthy();
    jest.advanceTimersByTime(1000);
    await flushPromises();
    expect(home.checkInSession).toBe('afternoon');
    expect(home.currentCheckIn).toBeUndefined();
    expect(home.checkIns).toHaveLength(1);
    wrapper.unmount();
  });

  test('does not show an explanatory message while collecting the first hour', async () => {
    fetchDailyCheckIns.mockResolvedValue({ ...checkinResponse(), checkins: [{
      checkin_date: '2026-08-31', session: 'morning', checked_at: '2026-08-31T09:30:00+02:00',
      inference_due_at: '2026-08-31T10:30:00+02:00', session_ends_at: '2026-08-31T12:00:00+02:00',
    }] });
    const wrapper = mountHome();
    await flushPromises();
    expect(wrapper.vm.currentCheckIn).toBeTruthy();
    expect(wrapper.vm.checkInMessage).toBe('');
    wrapper.unmount();
  });

  test('prevents double check-in and permits retry after a failed save', async () => {
    jest.setSystemTime(new Date('2026-08-31T09:00:00+02:00'));
    const wrapper = mountHome();
    await flushPromises();
    createDailyCheckIn.mockRejectedValueOnce(new Error('offline'));
    const home = wrapper.vm as InstanceType<typeof HomeView>;
    await home.handleDailyCheckIn();
    expect(home.checkInError).toContain('Could not save');
    expect(home.checkInSaving).toBe(false);
    createDailyCheckIn.mockResolvedValueOnce(checkinResponse('2026-08-31', 'morning', true).checkins[0]);
    const saving = home.handleDailyCheckIn();
    await home.handleDailyCheckIn();
    await saving;
    expect(createDailyCheckIn).toHaveBeenCalledTimes(2);
    expect(home.currentCheckIn).toBeTruthy();
    await home.handleDailyCheckIn();
    expect(createDailyCheckIn).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  test('removes the boundary timer and resume listeners when leaving Home', async () => {
    const wrapper = mountHome();
    await flushPromises();
    wrapper.unmount();
    expect(jest.getTimerCount()).toBe(0);
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    jest.advanceTimersByTime(48 * 60 * 60 * 1000);
    await flushPromises();
    expect(fetchDailyCheckIns).toHaveBeenCalledTimes(1);
  });

  test('switches between All and Important without resetting the calendar', async () => {
    const wrapper = mountHome();
    await flushPromises();
    const insights = wrapper.findComponent(InsightsContentStub);
    const buttons = wrapper.get('[aria-label="Insights view"]').findAll('button');
    expect(buttons.map(button => button.text())).toEqual(['Important', 'All']);
    expect(buttons[0].attributes('aria-pressed')).toBe('true');
    expect(insights.props('importantOnly')).toBe(true);

    await buttons[1].trigger('click');
    expect(buttons[1].attributes('aria-pressed')).toBe('true');
    expect(insights.props('importantOnly')).toBe(false);
    await wrapper.setData({ calendarDate: '2026-08-30' });
    expect(insights.props('date')).toBe('2026-08-30');
    expect(insights.props('importantOnly')).toBe(false);

    await buttons[0].trigger('click');
    expect(insights.props('importantOnly')).toBe(true);
    expect(insights.props('date')).toBe('2026-08-30');
    wrapper.unmount();
  });
});
