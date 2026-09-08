import { flushPromises, mount } from '@vue/test-utils';

const fetchCounterfactual = jest.fn();
const confirmInsight = jest.fn();
jest.mock('~/features/daily-check-in/lib/dailyCheckInClient', () => ({
  confirmInsight: (...args: unknown[]) => confirmInsight(...args),
}));
jest.mock('~/features/insights/lib/insightsClient', () => ({
  fetchCounterfactual: (...args: unknown[]) => fetchCounterfactual(...args),
}));
jest.mock('~/features/insights/lib/modelFeedbackClient', () => ({
  fetchModelFeedback: jest.fn().mockResolvedValue({ feedback: null }),
  submitModelFeedback: jest.fn(),
}));

import InsightSessionCard from '~/features/insights/components/InsightSessionCard.vue';
import type { ModelOutputReport } from '~/shared/contracts/model-output.generated';

const report: ModelOutputReport = {
  id: '0900-1000-morning',
  date: '2026-08-02',
  period_start: '2026-08-02T09:00:00+02:00',
  period_end: '2026-08-02T10:00:00+02:00',
  checkin_session: 'morning', suggestions_available_at: '2026-08-02T10:00:00+02:00',
  feedback_available_at: '2026-08-02T11:00:00+02:00',
  confirmation: { required_targets: ['mood_valence'], confirmed_targets: ['mood_valence'],
    confirm_by: '2026-08-02T11:00:00+02:00', session_ends_at: '2026-08-02T12:00:00+02:00',
    feedback_available_at: '2026-08-02T11:00:00+02:00' },
  results: [
    {
      id: 'mood_valence',
      title: 'Mood',
      score: 1.2,
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
  ],
};

describe('InsightSessionCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-02T11:15:00+02:00'));
    confirmInsight.mockReset();
    fetchCounterfactual.mockReset();
    fetchCounterfactual.mockResolvedValue({
      target: 'mood_valence',
      strength: 'Improve slightly',
      shifts: [
        {
          category: 'media',
          title: 'Media',
          current_minutes: 20,
          delta_minutes: -5,
        },
        {
          category: 'research',
          title: 'Research',
          current_minutes: 10,
          delta_minutes: 5,
        },
      ],
    });
  });

  afterEach(() => jest.useRealTimers());

  test('shows Confirm only in the opened suggestion and closes after confirmation succeeds', async () => {
    const progress = { required_targets: ['mood_valence'], confirmed_targets: [],
      confirm_by: '2026-08-02T11:00:00+02:00', session_ends_at: '2026-08-02T12:00:00+02:00',
      feedback_available_at: null };
    const sessionReport = { ...report, id: '0900-1000-morning', checkin_session: 'morning',
      period_start: '2026-08-02T09:00:00+02:00', period_end: '2026-08-02T10:00:00+02:00',
      confirmation: progress, feedback_available_at: null };
    const wrapper = mount(InsightSessionCard, {
      props: { report: sessionReport, nowMs: Date.parse('2026-08-02T10:30:00+02:00') },
      global: { stubs: { teleport: true, icon: true, 'aw-alert': true } },
    });
    expect(wrapper.find('[aria-label="Confirm Mood"]').exists()).toBe(false);
    await wrapper.get('button.aw-insights-answer-card').trigger('click');
    await flushPromises();
    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.find('[aria-label="Confirm Mood"]').exists()).toBe(true);
    expect(wrapper.findAll('[aria-label="Confirm Mood"]')).toHaveLength(1);
    expect(dialog.find('.aw-feedback-opens').exists()).toBe(false);
    expect(dialog.text()).not.toContain('Confirm every suggestion');
    const saved = { ...progress, confirmed_targets: ['mood_valence'],
      feedback_available_at: '2026-08-02T11:30:00+02:00' };
    let finish!: (value: unknown) => void;
    confirmInsight.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    await dialog.get('[aria-label="Confirm Mood"]').trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    expect(dialog.get('[aria-label="Confirm Mood"]').text()).toBe('Confirming…');
    finish(saved);
    await flushPromises();
    expect(confirmInsight).toHaveBeenCalledWith('2026-08-02', '0900-1000-morning', 'mood_valence');
    expect(wrapper.emitted('confirmed')).toEqual([[saved]]);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    await wrapper.setProps({ report: { ...sessionReport, confirmation: saved,
      feedback_available_at: saved.feedback_available_at } });
    await wrapper.get('button.aw-insights-answer-card').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="dialog"] [aria-label="Confirm Mood"]').text()).toBe('Confirmed');
    await wrapper.get('[aria-label="Close modal"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[aria-label="Confirm Mood"]').exists()).toBe(false);
    wrapper.unmount();
  });

  test('keeps the suggestion open when confirmation fails so the user can retry', async () => {
    const wrapper = mount(InsightSessionCard, {
      props: { report: { ...report, checkin_session: 'morning', feedback_available_at: null,
        confirmation: { required_targets: ['mood_valence'], confirmed_targets: [],
          confirm_by: '2026-08-02T11:00:00+02:00', session_ends_at: '2026-08-02T12:00:00+02:00',
          feedback_available_at: null } }, nowMs: Date.parse('2026-08-02T10:30:00+02:00') },
      global: { stubs: { teleport: true, icon: true, 'aw-alert': true } },
    });
    confirmInsight.mockRejectedValue(new Error('offline'));
    await wrapper.get('button.aw-insights-answer-card').trigger('click');
    await flushPromises();
    await wrapper.get('[aria-label="Confirm Mood"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="dialog"] [role="alert"]').text()).toContain('Please try again');
    expect(wrapper.get('[aria-label="Confirm Mood"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.emitted('confirmed')).toBeUndefined();
    wrapper.unmount();
  });

  test('marks suggestions with an exclamation and gives open questionnaires priority', async () => {
    const progress = { required_targets: ['mood_valence'], confirmed_targets: [],
      confirm_by: '2026-08-02T11:00:00+02:00', session_ends_at: '2026-08-02T12:00:00+02:00',
      feedback_available_at: null };
    const sessionReport = { ...report, checkin_session: 'morning', confirmation: progress,
      feedback_available_at: null };
    const wrapper = mount(InsightSessionCard, {
      props: { report: sessionReport, pendingFeedbackTargetIds: ['mood_valence'],
        nowMs: Date.parse('2026-08-02T10:30:00+02:00') },
      global: { stubs: { icon: true, InsightCounterfactualModal: true } },
    });
    const cards = wrapper.findAll('.aw-insights-answer-card');
    expect(cards[0].get('.aw-suggestion-marker').attributes('aria-label')).toBe('Suggestion');
    expect(cards[0].get('.aw-suggestion-marker icon-stub').attributes('name')).toBe('exclamation-circle');
    expect(cards[0].find('.aw-counterfactual-marker').exists()).toBe(false);
    expect(cards[1].find('.aw-suggestion-marker, .aw-counterfactual-marker').exists()).toBe(false);
    const saved = { ...progress, confirmed_targets: ['mood_valence'],
      feedback_available_at: '2026-08-02T11:30:00+02:00' };
    await wrapper.setProps({ report: { ...sessionReport, confirmation: saved,
      feedback_available_at: saved.feedback_available_at } });
    expect(cards[0].find('.aw-suggestion-marker').exists()).toBe(true);
    await wrapper.setProps({ nowMs: Date.parse(saved.feedback_available_at) });
    expect(cards[0].find('.aw-suggestion-marker').exists()).toBe(false);
    expect(cards[0].get('.aw-counterfactual-marker').attributes('aria-label')).toBe('Feedback questionnaire');
    // Completed feedback stays discoverable in All with a check mark.
    await wrapper.setProps({ pendingFeedbackTargetIds: [], completedFeedbackTargetIds: ['mood_valence'] });
    expect(cards[0].find('.aw-counterfactual-marker').exists()).toBe(false);
    expect(cards[0].find('.aw-suggestion-marker').exists()).toBe(false);
    expect(cards[0].get('.aw-completed-marker icon-stub').attributes('name')).toBe('check');
    wrapper.unmount();
  });

  test('shows semantic states and an automatic counterfactual', async () => {
    const wrapper = mount(InsightSessionCard, {
      props: { report, pendingFeedbackTargetIds: ['mood_valence'] },
      global: {
        stubs: {
          teleport: true,
          icon: true,
          'aw-alert': true,
          'ui-button': {
            template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Morning insights · 09:00–10:00');
    expect(wrapper.findAll('button.aw-insights-answer-card')).toHaveLength(2);
    const progressBars = wrapper.findAll('.aw-score-progress-bar');
    expect(progressBars).toHaveLength(2);
    expect(progressBars[0].attributes('style')).toContain('width: 20%');
    expect(progressBars[1].attributes('style')).toContain('width: 50%');
    expect(progressBars[0].attributes('data-progress')).toBe('20');
    expect(progressBars[1].attributes('data-progress')).toBe('50');
    expect(wrapper.findAll('.aw-counterfactual-marker')).toHaveLength(1);
    expect(wrapper.findAll('.aw-insights-card-strip')).toHaveLength(1);
    expect(wrapper.find('[data-insights-group]').exists()).toBe(false);
    await wrapper.setProps({ pendingFeedbackTargetIds: [] });
    expect(wrapper.findAll('.aw-counterfactual-marker')).toHaveLength(0);
    expect(wrapper.get('.aw-insights-card-strip').attributes('style')).toContain(
      '--insight-columns: 2'
    );
    await wrapper.setProps({ pendingFeedbackTargetIds: ['mood_valence'] });
    await wrapper.setProps({ attentionTargetId: 'mood_valence' });
    expect(wrapper.findAll('button.aw-insights-answer-card')[0].classes()).toContain(
      'aw-insights-answer-card-attention'
    );
    expect(wrapper.findAll('button.aw-insights-answer-card')[1].classes()).not.toContain(
      'aw-insights-answer-card-attention'
    );
    await wrapper.get('button.aw-insights-answer-card').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Current state');
    expect(wrapper.text()).toContain('Negative mood');
    expect(wrapper.text()).toContain('Better state');
    expect(wrapper.text()).toContain('Neutral mood');
    expect(wrapper.find('input[type="range"]').exists()).toBe(false);
    expect(fetchCounterfactual).toHaveBeenCalledWith(
      '2026-08-02',
      '0900-1000-morning',
      'mood_valence'
    );
    expect(wrapper.text()).toContain('Suggestion:');
    expect(wrapper.text()).toContain(
      'If you spent 5 min less on Media and 5 min more on Research, the model would move toward neutral mood.'
    );
    expect(wrapper.text()).toContain('Did you try to follow this suggestion?');
    expect(wrapper.text()).not.toContain('Did following it help?');
    wrapper.unmount();
  });

  test.each([1.2, 6])('hides the suggestion section when no advice is available (score %s)', async score => {
    fetchCounterfactual.mockResolvedValue({ target: 'mood_valence', strength: 'Keep', shifts: [] });
    const wrapper = mount(InsightSessionCard, {
      props: { report: { ...report, results: [{ ...report.results[0], score }] } },
      global: { stubs: { teleport: true, icon: true, 'aw-alert': true, 'ui-button': true } },
    });
    await wrapper.get('button.aw-insights-answer-card').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Current state');
    expect(wrapper.text()).toContain('Better state');
    expect(wrapper.find('.aw-counterfactual-suggestion').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Suggestion:');
    expect(wrapper.text()).not.toContain('nearby activity pattern');
    expect(wrapper.text()).not.toContain('Did you try to follow this suggestion?');
    wrapper.unmount();
  });

  test('keeps all cards in one uniform row regardless of questionnaire status', async () => {
    const ids = [
      'mood_valence', 'arousal', 'restfulness', 'stress_management', 'productivity', 'engagement',
    ];
    const wrapper = mount(InsightSessionCard, {
      props: {
        report: {
          ...report,
          results: ids.map(id => ({ ...report.results[0], id, title: id })),
        },
        pendingFeedbackTargetIds: ['mood_valence', 'arousal'],
      },
      global: { stubs: { icon: true, InsightCounterfactualModal: true } },
    });

    expect(wrapper.findAll('.aw-insights-card-strip')).toHaveLength(1);
    expect(wrapper.get('.aw-insights-card-strip').attributes('style')).toContain(
      '--insight-columns: 6'
    );
    expect(wrapper.findAll('.aw-counterfactual-marker')).toHaveLength(2);
    expect(wrapper.find('[data-insights-group]').exists()).toBe(false);
    expect(wrapper.find('.aw-insights-card-strip-compact').exists()).toBe(false);

    await wrapper.setProps({ pendingFeedbackTargetIds: ids });
    expect(wrapper.findAll('.aw-insights-card-strip')).toHaveLength(1);
    expect(wrapper.get('.aw-insights-card-strip').attributes('style')).toContain(
      '--insight-columns: 6'
    );
    expect(wrapper.findAll('button.aw-insights-answer-card')).toHaveLength(6);
    await wrapper.setProps({ report: { ...report, results: [report.results[0]] } });
    expect(wrapper.get('.aw-insights-card-strip').attributes('style')).toContain(
      '--insight-columns: 1'
    );
    expect(wrapper.findAll('.aw-score-card')).toHaveLength(1);
    expect(wrapper.find('.aw-insights-card-strip-compact').exists()).toBe(false);
    wrapper.unmount();
  });

  test('shows advice first and opens the questionnaire at its scheduled time', async () => {
    const wrapper = mount(InsightSessionCard, {
      props: {
        report: { ...report, feedback_available_at: '2026-08-02T11:30:00+02:00' },
        nowMs: Date.parse('2026-08-02T11:15:00+02:00'),
        pendingFeedbackTargetIds: ['mood_valence'],
      },
      global: { stubs: { teleport: true, icon: true, 'aw-alert': true, 'ui-button': true } },
    });
    await wrapper.get('button.aw-insights-answer-card').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Suggestion:');
    expect(wrapper.text()).toContain('Try the suggestions. Feedback opens at');
    expect(wrapper.text()).not.toContain('Did you try to follow this suggestion?');
    await wrapper.setProps({ nowMs: Date.parse('2026-08-02T11:30:00+02:00') });
    await flushPromises();
    expect(wrapper.text()).toContain('Did you try to follow this suggestion?');
    wrapper.unmount();
  });
});
