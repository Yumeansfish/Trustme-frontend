import { flushPromises, mount } from '@vue/test-utils';

const fetchInsights = jest.fn();
const fetchModelFeedback = jest.fn();

jest.mock('~/features/insights/lib/insightsClient', () => ({
  fetchInsights: (...args: unknown[]) => fetchInsights(...args),
}));
jest.mock('~/features/insights/lib/modelFeedbackClient', () => ({
  fetchModelFeedback: (...args: unknown[]) => fetchModelFeedback(...args),
}));

import InsightsContent from '~/features/insights/components/InsightsContent.vue';
import InsightSessionCard from '~/features/insights/components/InsightSessionCard.vue';
import type { ModelOutputReport } from '~/shared/contracts/model-output.generated';

const report: ModelOutputReport = {
  id: '0900-1000-morning',
  date: '2026-08-16',
  period_start: '2026-08-16T09:00:00+02:00',
  period_end: '2026-08-16T10:00:00+02:00',
  checkin_session: 'morning', suggestions_available_at: '2026-08-16T10:00:00+02:00',
  feedback_available_at: '2026-08-16T11:00:00+02:00',
  confirmation: { required_targets: ['mood_valence', 'productivity'], confirmed_targets: ['mood_valence', 'productivity'],
    confirm_by: '2026-08-16T11:00:00+02:00', session_ends_at: '2026-08-16T12:00:00+02:00',
    feedback_available_at: '2026-08-16T11:00:00+02:00' },
  results: [
    {
      id: 'mood_valence',
      title: 'Mood',
      score: 2.5,
      scale: { min: 0, max: 6, min_label: 'Negative', max_label: 'Positive' },
      has_counterfactual: true,
    },
    {
      id: 'arousal',
      title: 'Energy',
      score: 3,
      scale: { min: 0, max: 6, min_label: 'Low', max_label: 'High' },
      has_counterfactual: false,
    },
    {
      id: 'productivity',
      title: 'Productivity',
      score: 4,
      scale: { min: 0, max: 6, min_label: 'Low', max_label: 'High' },
      has_counterfactual: true,
    },
  ],
};

describe('InsightsContent pending feedback navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-16T11:30:00+02:00'));
    fetchInsights.mockReset();
    fetchModelFeedback.mockReset();
    fetchInsights.mockResolvedValue({
      available_dates: ['2026-08-16'],
      reports: [report],
    });
    fetchModelFeedback.mockImplementation(
      async (_date: string, _periodId: string, target: string) => ({
        feedback:
          target === 'productivity'
            ? {
                date: '2026-08-16',
                period_id: '0900-1000-morning',
                target,
                tried_to_follow: false,
                helped: null,
                submitted_at: '2026-08-16T12:00:00+02:00',
              }
            : null,
      })
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('an earlier confirmation response cannot undo the completed round', async () => {
    const progress = { required_targets: ['mood_valence', 'productivity'], confirmed_targets: [],
      confirm_by: '2026-08-16T11:00:00+02:00', session_ends_at: '2026-08-16T12:00:00+02:00',
      feedback_available_at: null };
    fetchInsights.mockResolvedValue({ available_dates: [report.date],
      reports: [{ ...report, checkin_session: 'morning', confirmation: progress }] });
    const wrapper = mount(InsightsContent, { props: { date: report.date },
      global: { stubs: { icon: true, 'aw-alert': true, InsightSessionCard: true } } });
    await flushPromises();
    const saved = { ...progress, confirmed_targets: ['mood_valence', 'productivity'],
      feedback_available_at: '2026-08-16T11:15:00+02:00' };
    wrapper.vm.handleConfirmed(report.id, saved);
    wrapper.vm.handleConfirmed(report.id, { ...progress, confirmed_targets: ['mood_valence'] });
    expect(wrapper.vm.reports[0].confirmation).toEqual(saved);
    expect(wrapper.vm.reports[0].feedback_available_at).toBe(saved.feedback_available_at);
    wrapper.unmount();
  });

  test('counts unanswered insight questionnaires and highlights the first one', async () => {
    const wrapper = mount(InsightsContent, {
      props: { date: '2026-08-16', importantOnly: false },
      global: {
        stubs: {
          icon: true,
          'aw-alert': true,
          InsightCounterfactualModal: true,
        },
      },
    });
    await flushPromises();

    const changes = wrapper.emitted('pending-feedback-change');
    expect(changes?.[changes.length - 1]?.[0]).toEqual({
      count: 1,
      error: false,
      loading: false,
    });
    expect(fetchModelFeedback).toHaveBeenCalledTimes(2);
    expect(wrapper.findAll('.aw-counterfactual-marker')).toHaveLength(1);

    await (wrapper.vm as InstanceType<typeof InsightsContent>).drawAttentionToFirstPendingFeedback();
    expect(wrapper.get('[data-feedback-target="mood_valence"]').classes()).toContain(
      'aw-insights-answer-card-attention'
    );
    expect(wrapper.get('[data-feedback-target="productivity"]').classes()).not.toContain(
      'aw-insights-answer-card-attention'
    );

    wrapper.findComponent(InsightSessionCard).vm.$emit('feedback-submitted', {
      date: '2026-08-16',
      period_id: '0900-1000-morning',
      target: 'mood_valence',
      tried_to_follow: false,
      helped: null,
      submitted_at: '2026-08-16T12:05:00+02:00',
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.aw-counterfactual-marker')).toHaveLength(0);
    expect(wrapper.emitted('pending-feedback-change')?.at(-1)?.[0]).toEqual({
      count: 0,
      error: false,
      loading: false,
    });

    jest.advanceTimersByTime(850);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-feedback-target="mood_valence"]').classes()).not.toContain(
      'aw-insights-answer-card-attention'
    );

    await wrapper.setProps({ forceEmpty: true });
    expect(wrapper.find('.aw-insights-answer-card').exists()).toBe(false);
    expect(wrapper.get('.aw-insights-empty-panda').attributes('src')).toBe(
      '/questionnaire-panda.png'
    );
    expect(wrapper.text()).toContain('Good morning');
    expect(wrapper.text()).toContain('Your insights will appear here later today.');
  });

  test.each([
    [11, 'Good morning', 'Your insights will appear here later today.'],
    [12, 'Good afternoon', 'Your insights will appear here later today.'],
    [17, 'Good afternoon', 'Your insights will appear here later today.'],
    [18, 'Good evening', 'Time to relax!'],
    [23, 'Good evening', 'Time to relax!'],
  ])('shows the appropriate panda message at local hour %i', async (hour, greeting, message) => {
    jest.setSystemTime(new Date(2026, 7, 16, hour as number));
    fetchInsights.mockResolvedValue({ available_dates: [], reports: [] });
    const wrapper = mount(InsightsContent, {
      props: { date: '2026-08-16' },
      global: { stubs: { icon: true, 'aw-alert': true, InsightSessionCard: true } },
    });
    await flushPromises();
    expect(wrapper.get('.aw-insights-empty h3').text()).toBe(greeting);
    expect(wrapper.get('.aw-insights-empty p').text()).toBe(message);
    if ((hour as number) >= 18) expect(wrapper.get('.aw-insights-empty').text()).not.toMatch(/insight/i);
    wrapper.unmount();
  });

  test('changes the panda to relaxation after 18:00 without reloading', async () => {
    jest.setSystemTime(new Date(2026, 7, 16, 17, 59, 40));
    fetchInsights.mockResolvedValue({ available_dates: [], reports: [] });
    const wrapper = mount(InsightsContent, {
      props: { date: '2026-08-16' },
      global: { stubs: { icon: true, 'aw-alert': true, InsightSessionCard: true } },
    });
    await flushPromises();
    expect(wrapper.get('.aw-insights-empty').text()).toContain('Good afternoon');
    jest.advanceTimersByTime(30_000);
    await flushPromises();
    expect(wrapper.get('.aw-insights-empty h3').text()).toBe('Good evening');
    expect(wrapper.get('.aw-insights-empty p').text()).toBe('Time to relax!');
    wrapper.unmount();
  });

  test('does not mention insights in the evening when Important is empty or viewing a past day', async () => {
    jest.setSystemTime(new Date(2026, 7, 16, 18));
    fetchInsights.mockResolvedValue({
      available_dates: [report.date],
      reports: [{ ...report, results: report.results.map(result => ({ ...result, has_counterfactual: false })) }],
    });
    const wrapper = mount(InsightsContent, {
      props: { date: report.date },
      global: { stubs: { icon: true, 'aw-alert': true, InsightSessionCard: true } },
    });
    await flushPromises();
    expect(wrapper.get('.aw-insights-empty h3').text()).toBe('Good evening');
    expect(wrapper.get('.aw-insights-empty p').text()).toBe('Time to relax!');
    fetchInsights.mockResolvedValue({ available_dates: [], reports: [] });
    await wrapper.setProps({ date: '2026-08-15' });
    await flushPromises();
    expect(wrapper.get('.aw-insights-empty p').text()).toBe('Time to relax!');
    wrapper.unmount();
  });

  test('describes an empty historical day without promising later results', async () => {
    fetchInsights.mockResolvedValue({
      available_dates: ['2026-08-15'],
      reports: [],
    });
    const wrapper = mount(InsightsContent, {
      props: { date: '2026-08-15' },
      global: {
        stubs: {
          icon: true,
          'aw-alert': true,
          InsightCounterfactualModal: true,
        },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('No insights are available for this day.');
    expect(wrapper.text()).not.toContain('later today');
    wrapper.unmount();
  });

  test('counts unread suggestions, then waiting time, then opened questionnaires without double counting', async () => {
    jest.setSystemTime(new Date('2026-08-16T10:15:00+02:00'));
    fetchModelFeedback.mockResolvedValue({ feedback: null });
    const progress = { required_targets: ['mood_valence', 'productivity'], confirmed_targets: [],
      confirm_by: '2026-08-16T11:00:00+02:00', session_ends_at: '2026-08-16T12:00:00+02:00',
      feedback_available_at: null };
    const sessionReport = { ...report, id: '0900-1000-morning', checkin_session: 'morning',
      period_start: '2026-08-16T09:00:00+02:00', period_end: '2026-08-16T10:00:00+02:00',
      confirmation: progress, feedback_available_at: null };
    fetchInsights.mockResolvedValue({ available_dates: [report.date], reports: [sessionReport] });
    const wrapper = mount(InsightsContent, {
      props: { date: report.date },
      global: { stubs: { icon: true, 'aw-alert': true, InsightCounterfactualModal: true } },
    });
    await flushPromises();
    const count = () => (wrapper.emitted('pending-feedback-change')?.at(-1)?.[0] as { count: number }).count;
    expect(count()).toBe(2);
    expect(fetchModelFeedback).not.toHaveBeenCalled();
    expect(wrapper.findAll('.aw-counterfactual-marker')).toHaveLength(0);
    expect(await wrapper.vm.drawAttentionToFirstPendingFeedback()).toBe(true);
    expect(wrapper.vm.attentionTargetId).toBe('mood_valence');

    wrapper.vm.handleConfirmed(sessionReport.id, { ...progress, confirmed_targets: ['mood_valence'] });
    expect(count()).toBe(1);
    expect(await wrapper.vm.drawAttentionToFirstPendingFeedback()).toBe(true);
    expect(wrapper.vm.attentionTargetId).toBe('productivity');

    const saved = { ...progress, confirmed_targets: [...progress.required_targets],
      feedback_available_at: '2026-08-16T11:15:00+02:00' };
    wrapper.vm.handleConfirmed(sessionReport.id, saved);
    fetchInsights.mockResolvedValue({ available_dates: [report.date], reports: [{ ...sessionReport,
      confirmation: saved, feedback_available_at: saved.feedback_available_at }] });
    expect(count()).toBe(0);
    expect(await wrapper.vm.drawAttentionToFirstPendingFeedback()).toBe(false);
    jest.setSystemTime(new Date('2026-08-16T11:14:59+02:00'));
    await wrapper.vm.refreshVisibleInsights();
    expect(count()).toBe(0);
    jest.advanceTimersByTime(1100);
    await flushPromises();
    expect(count()).toBe(2);
    expect(wrapper.findAll('.aw-counterfactual-marker')).toHaveLength(2);
    expect(await wrapper.vm.drawAttentionToFirstPendingFeedback()).toBe(true);
    wrapper.vm.handleFeedbackSubmitted({ date: report.date, period_id: sessionReport.id,
      target: 'mood_valence', tried_to_follow: false, helped: null,
      submitted_at: '2026-08-16T11:15:01+02:00' });
    expect(count()).toBe(1);
    wrapper.unmount();
  });

  test('keeps unconfirmed tasks after 11', async () => {
    jest.setSystemTime(new Date('2026-08-16T10:59:59+02:00'));
    fetchInsights.mockResolvedValue({ available_dates: [report.date], reports: [{ ...report,
      checkin_session: 'morning', feedback_available_at: null,
      confirmation: { required_targets: ['mood_valence', 'productivity'], confirmed_targets: [],
        confirm_by: '2026-08-16T11:00:00+02:00', session_ends_at: '2026-08-16T12:00:00+02:00',
        feedback_available_at: null },
    }] });
    const wrapper = mount(InsightsContent, {
      props: { date: report.date },
      global: { stubs: { icon: true, 'aw-alert': true, InsightCounterfactualModal: true } },
    });
    await flushPromises();
    expect(wrapper.emitted('pending-feedback-change')?.at(-1)?.[0]).toMatchObject({ count: 2 });
    jest.setSystemTime(new Date('2026-08-16T11:00:00+02:00'));
    await wrapper.vm.refreshVisibleInsights();
    expect(wrapper.emitted('pending-feedback-change')?.at(-1)?.[0]).toMatchObject({ count: 2 });
    expect(await wrapper.vm.drawAttentionToFirstPendingFeedback()).toBe(true);
    wrapper.unmount();
  });

  test('keeps upcoming questionnaires important but only counts them when feedback opens', async () => {
    jest.setSystemTime(new Date('2026-08-16T10:59:59+02:00'));
    fetchInsights.mockResolvedValue({
      available_dates: ['2026-08-16'],
      reports: [{ ...report, feedback_available_at: '2026-08-16T11:00:00+02:00' }],
    });
    const wrapper = mount(InsightsContent, {
      props: { date: '2026-08-16' },
      global: { stubs: { icon: true, 'aw-alert': true, InsightCounterfactualModal: true } },
    });
    await flushPromises();
    expect(wrapper.get('.aw-insights-card-strip').text()).toContain('Mood');
    expect(wrapper.emitted('pending-feedback-change')?.at(-1)?.[0]).toMatchObject({ count: 0 });
    expect(await wrapper.vm.drawAttentionToFirstPendingFeedback()).toBe(false);
    expect(await wrapper.vm.drawAttentionToFirstPendingFeedback(report.id, true)).toBe(true);
    jest.advanceTimersByTime(1050);
    await flushPromises();
    expect(wrapper.emitted('pending-feedback-change')?.at(-1)?.[0]).toMatchObject({ count: 1 });
    wrapper.unmount();
  });

  test('refreshes new insights without reloading the page', async () => {
    fetchInsights.mockResolvedValueOnce({ available_dates: [], reports: [] });
    const wrapper = mount(InsightsContent, {
      props: { date: '2026-08-16' },
      global: { stubs: { icon: true, 'aw-alert': true, InsightCounterfactualModal: true } },
    });
    await flushPromises();
    expect(wrapper.find('.aw-insights-empty').exists()).toBe(true);
    jest.advanceTimersByTime(30_000);
    await flushPromises();
    expect(wrapper.find('.aw-insights-empty').exists()).toBe(false);
    expect(wrapper.find('.aw-insights-answer-card').exists()).toBe(true);
    wrapper.unmount();
  });

  test('defaults to important cards and hides periods with no pending questionnaires', async () => {
    const otherPeriod = {
      ...report,
      id: '1200-1300',
      period_start: '2026-08-16T12:00:00+02:00',
      period_end: '2026-08-16T13:00:00+02:00',
      results: [report.results[1]],
    };
    fetchInsights.mockResolvedValue({ available_dates: [report.date], reports: [report, otherPeriod] });
    const wrapper = mount(InsightsContent, {
      props: { date: report.date },
      global: { stubs: { icon: true, 'aw-alert': true, InsightCounterfactualModal: true } },
    });
    await flushPromises();

    expect(wrapper.findAll('.aw-insights-answer-card')).toHaveLength(1);
    expect(wrapper.get('.aw-insights-answer-card').text()).toContain('Mood');
    expect(wrapper.findAll('.aw-counterfactual-marker')).toHaveLength(1);
    expect(wrapper.findAll('.aw-insights-period')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('12:00–13:00');
    await wrapper.get('.aw-insights-answer-card').trigger('click');
    const modal = wrapper.findComponent({ name: 'InsightCounterfactualModal' });
    expect(modal.props('open')).toBe(true);
    expect(modal.props('periodId')).toBe(report.id);
    expect(modal.props('result')).toMatchObject({ id: 'mood_valence' });

    await wrapper.setProps({ importantOnly: false });
    expect(wrapper.findAll('.aw-insights-answer-card')).toHaveLength(4);
    expect(wrapper.findAll('.aw-insights-period')).toHaveLength(2);
    expect(wrapper.findAll('.aw-insights-card-strip')).toHaveLength(2);
    expect(wrapper.find('[data-insights-group]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Energy');
    expect(wrapper.text()).toContain('Productivity');
    expect(wrapper.findAll('[aria-label="Feedback questionnaire"]')).toHaveLength(1);
    expect(wrapper.findAll('[aria-label="Suggestion"]')).toHaveLength(1);
    expect(fetchInsights).toHaveBeenCalledTimes(1);
    expect(fetchModelFeedback).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('pending-feedback-change')?.at(-1)?.[0]).toMatchObject({ count: 1 });
    wrapper.unmount();
  });

  test('groups Important as Morning then Afternoon with compact cards and leaves All unchanged', async () => {
    const afternoon = { ...report, id: '1300-1400-afternoon', checkin_session: 'afternoon',
      period_start: '2026-08-16T13:00:00+02:00', period_end: '2026-08-16T14:00:00+02:00' };
    fetchModelFeedback.mockResolvedValue({ feedback: null });
    fetchInsights.mockResolvedValue({ available_dates: [report.date], reports: [afternoon, report] });
    const wrapper = mount(InsightsContent, {
      props: { date: report.date },
      global: { stubs: { icon: true, 'aw-alert': true, InsightCounterfactualModal: true } },
    });
    await flushPromises();
    const groups = wrapper.findAll('[data-session]');
    expect(groups.map(group => group.attributes('data-session'))).toEqual(['morning', 'afternoon']);
    expect(groups.map(group => group.get('h3').text())).toEqual([
      'Morning · 09:00–10:00', 'Afternoon · 13:00–14:00',
    ]);
    expect(groups.map(group => group.findAll('.aw-insights-answer-card').length)).toEqual([2, 2]);
    expect(wrapper.findAllComponents(InsightSessionCard).every(card => card.props('compact'))).toBe(true);
    await groups[1].get('.aw-insights-answer-card').trigger('click');
    expect(groups[1].findComponent({ name: 'InsightCounterfactualModal' }).props('periodId')).toBe(afternoon.id);

    await wrapper.setProps({ importantOnly: false });
    expect(wrapper.find('[data-session]').exists()).toBe(false);
    expect(wrapper.find('.aw-insights-reports-important').exists()).toBe(false);
    expect(wrapper.findAllComponents(InsightSessionCard).every(card => !card.props('compact'))).toBe(true);
    expect(wrapper.findAll('.aw-insights-answer-card')).toHaveLength(6);
    wrapper.unmount();
  });

  test('keeps a lone afternoon in its own group without padding it with fake cards', async () => {
    fetchInsights.mockResolvedValue({ available_dates: [report.date], reports: [{ ...report,
      id: '1300-1400-afternoon', checkin_session: 'afternoon', period_start: '2026-08-16T13:00:00+02:00', period_end: '2026-08-16T14:00:00+02:00',
    }] });
    const wrapper = mount(InsightsContent, {
      props: { date: report.date },
      global: { stubs: { icon: true, 'aw-alert': true, InsightCounterfactualModal: true } },
    });
    await flushPromises();
    expect(wrapper.find('[data-session="morning"]').exists()).toBe(false);
    expect(wrapper.get('[data-session="afternoon"]').findAll('.aw-insights-answer-card')).toHaveLength(1);
    expect(wrapper.findComponent(InsightSessionCard).props('compact')).toBe(true);
    wrapper.unmount();
  });

  test('removes answered cards from Important but keeps them in All', async () => {
    const wrapper = mount(InsightsContent, {
      props: { date: report.date },
      global: { stubs: { icon: true, 'aw-alert': true, InsightCounterfactualModal: true } },
    });
    await flushPromises();
    expect(await wrapper.vm.drawAttentionToFirstPendingFeedback()).toBe(true);
    expect(wrapper.get('.aw-insights-answer-card').classes()).toContain(
      'aw-insights-answer-card-attention'
    );
    wrapper.findComponent(InsightSessionCard).vm.$emit('feedback-submitted', {
      date: report.date,
      period_id: report.id,
      target: 'mood_valence',
      tried_to_follow: false,
      helped: null,
      submitted_at: '2026-08-16T12:05:00+02:00',
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.aw-insights-period').exists()).toBe(false);
    expect(wrapper.find('.aw-insights-empty-panda').exists()).toBe(true);
    expect(wrapper.text()).toContain('No important insights');
    expect(wrapper.text()).toContain('Switch to All');
    expect(wrapper.emitted('pending-feedback-change')?.at(-1)?.[0]).toMatchObject({ count: 0 });

    await wrapper.setProps({ importantOnly: false });
    expect(wrapper.findAll('.aw-insights-answer-card')).toHaveLength(3);
    expect(wrapper.find('.aw-counterfactual-marker').exists()).toBe(false);
    expect(wrapper.find('.aw-insights-empty').exists()).toBe(false);
    wrapper.unmount();
  });

  test('keeps Important scoped to the calendar day and preserves the panda on an empty day', async () => {
    const wrapper = mount(InsightsContent, {
      props: { date: report.date },
      global: { stubs: { icon: true, 'aw-alert': true, InsightCounterfactualModal: true } },
    });
    await flushPromises();
    expect(wrapper.findAll('.aw-insights-answer-card')).toHaveLength(1);
    fetchInsights.mockResolvedValue({ available_dates: [report.date], reports: [] });
    await wrapper.setProps({ date: '2026-08-15' });
    await flushPromises();
    expect(wrapper.props('importantOnly')).toBe(true);
    expect(wrapper.find('.aw-insights-answer-card').exists()).toBe(false);
    expect(wrapper.find('.aw-insights-empty-panda').exists()).toBe(true);
    expect(wrapper.text()).toContain('No insights are available for this day.');
    wrapper.unmount();
  });

  test('does not mistake a feedback status failure for no important insights', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchModelFeedback.mockRejectedValue(new Error('offline'));
    const wrapper = mount(InsightsContent, {
      props: { date: report.date },
      global: {
        stubs: {
          icon: true,
          'aw-alert': { template: '<div><slot /></div>' },
          InsightCounterfactualModal: true,
        },
      },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Couldn't check which insights need feedback.");
    expect(wrapper.text()).not.toContain('No important insights');
    await wrapper.setProps({ importantOnly: false });
    expect(wrapper.findAll('.aw-insights-answer-card')).toHaveLength(3);
    wrapper.unmount();
    log.mockRestore();
  });
});
