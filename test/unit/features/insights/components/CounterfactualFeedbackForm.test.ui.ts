import { flushPromises, mount } from '@vue/test-utils';

const fetchModelFeedback = jest.fn();
const submitModelFeedback = jest.fn();
jest.mock('~/features/insights/lib/modelFeedbackClient', () => ({
  fetchModelFeedback: (...args: unknown[]) => fetchModelFeedback(...args),
  submitModelFeedback: (...args: unknown[]) => submitModelFeedback(...args),
}));

import CounterfactualFeedbackForm from '~/features/insights/components/CounterfactualFeedbackForm.vue';

function mountForm() {
  return mount(CounterfactualFeedbackForm, {
    props: {
      date: '2026-08-27',
      periodId: '1000-1100',
      target: 'productivity',
    },
    global: {
      stubs: {
        icon: true,
        'aw-alert': true,
        'ui-button': {
          props: ['disabled'],
          template: '<button type="submit" :disabled="disabled"><slot /></button>',
        },
      },
    },
  });
}

describe('CounterfactualFeedbackForm', () => {
  beforeEach(() => {
    fetchModelFeedback.mockReset();
    submitModelFeedback.mockReset();
    fetchModelFeedback.mockResolvedValue({ feedback: null });
    submitModelFeedback.mockResolvedValue({
      date: '2026-08-27',
      period_id: '1000-1100',
      target: 'productivity',
      tried_to_follow: true,
      helped: false,
      submitted_at: '2026-08-27T12:20:00+02:00',
    });
  });

  test('asks whether the suggestion helped only after it was tried', async () => {
    const wrapper = mountForm();
    await flushPromises();

    expect(fetchModelFeedback).toHaveBeenCalledWith(
      '2026-08-27',
      '1000-1100',
      'productivity'
    );
    expect(wrapper.text()).not.toContain('Did following it help?');

    await wrapper.get('#feedback-1000-1100-productivity-tried-yes').setValue(true);
    expect(wrapper.text()).toContain('Did following it help?');
    await wrapper.get('#feedback-1000-1100-productivity-helped-no').setValue(true);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(submitModelFeedback).toHaveBeenCalledWith({
      date: '2026-08-27',
      period_id: '1000-1100',
      target: 'productivity',
      tried_to_follow: true,
      helped: false,
    });
    expect(wrapper.emitted('submitted')).toHaveLength(1);
    expect(wrapper.text()).toContain('Thanks, your feedback has been saved.');
  });

  test('skips the second answer when the suggestion was not tried', async () => {
    const wrapper = mountForm();
    await flushPromises();
    submitModelFeedback.mockResolvedValueOnce({
      date: '2026-08-27',
      period_id: '1000-1100',
      target: 'productivity',
      tried_to_follow: false,
      helped: null,
      submitted_at: '2026-08-27T12:20:00+02:00',
    });

    await wrapper.get('#feedback-1000-1100-productivity-tried-no').setValue(true);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(submitModelFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ tried_to_follow: false, helped: null })
    );
  });
});
