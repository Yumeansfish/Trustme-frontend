import { flushPromises, mount } from '@vue/test-utils';
const confirmInsight = jest.fn();
jest.mock('~/features/daily-check-in/lib/dailyCheckInClient', () => ({
  confirmInsight: (...args: unknown[]) => confirmInsight(...args),
}));
import ConfirmInsightButton from '~/features/insights/components/ConfirmInsightButton.vue';

const progress = { required_targets: ['productivity', 'stress_management'], confirmed_targets: [],
  confirm_by: '2026-09-07T11:00:00+02:00', session_ends_at: '2026-09-07T12:00:00+02:00',
  feedback_available_at: null };
function render(now = '2026-09-07T10:15:00+02:00') {
  return mount(ConfirmInsightButton, { props: {
    date: '2026-09-07', periodId: '0907-1007-morning', target: 'productivity',
    title: 'Work productivity', progress, nowMs: Date.parse(now),
  } });
}
beforeEach(() => confirmInsight.mockReset());

test('confirms once and renders the saved progress returned by the server', async () => {
  let resolve!: (value: unknown) => void;
  confirmInsight.mockReturnValue(new Promise(done => { resolve = done; }));
  const wrapper = render();
  await wrapper.get('button').trigger('click');
  expect(wrapper.get('button').attributes('disabled')).toBeDefined();
  await wrapper.get('button').trigger('click');
  expect(confirmInsight).toHaveBeenCalledTimes(1);
  expect(confirmInsight).toHaveBeenCalledWith('2026-09-07', '0907-1007-morning', 'productivity');
  const saved = { ...progress, confirmed_targets: ['productivity'] };
  resolve(saved);
  await flushPromises();
  expect(wrapper.emitted('confirmed')).toEqual([[saved]]);
  await wrapper.setProps({ progress: saved });
  expect(wrapper.text()).toBe('Confirmed');
  expect(wrapper.get('button').attributes('disabled')).toBeDefined();
  wrapper.unmount();
});

test('permits confirmation after 11 without expiring the session', async () => {
  confirmInsight.mockResolvedValue({ ...progress, confirmed_targets: ['productivity'] });
  const wrapper = render('2026-09-07T11:50:00+02:00');
  expect(wrapper.text()).toBe('Confirm');
  await wrapper.get('button').trigger('click');
  expect(confirmInsight).toHaveBeenCalledTimes(1);
  wrapper.unmount();
});

test('shows an error and permits retry without claiming success', async () => {
  confirmInsight.mockRejectedValue(new Error('offline'));
  const wrapper = render();
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(wrapper.get('[role="alert"]').text()).toContain('Please try again');
  expect(wrapper.get('button').attributes('disabled')).toBeUndefined();
  expect(wrapper.emitted('confirmed')).toBeUndefined();
  wrapper.unmount();
});
