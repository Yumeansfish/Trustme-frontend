import { mount } from '@vue/test-utils';

import QuestionnaireTodoCard from '~/features/questionnaires/components/QuestionnaireTodoCard.vue';

function mountCard(pendingCount: number) {
  return mount(QuestionnaireTodoCard, {
    props: { pendingCount },
    global: { stubs: { Icon: true } },
  });
}

describe('QuestionnaireTodoCard', () => {
  test('shows the pending task count and delegates attention to Insights', async () => {
    const wrapper = mountCard(2);

    expect(wrapper.get('.aw-questionnaire-todo-badge').text()).toBe('2');
    expect(wrapper.text()).toContain('2 pending');
    expect(wrapper.get('button').attributes('aria-label')).toBe('To do, 2 pending tasks');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    await wrapper.get('.aw-questionnaire-todo-card').trigger('click');
    expect(wrapper.emitted('activate')).toHaveLength(1);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  test('stays inert when neither confirmations nor questionnaires are pending', async () => {
    const wrapper = mountCard(0);
    const button = wrapper.get<HTMLButtonElement>('.aw-questionnaire-todo-card');

    expect(button.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('All done');
    await button.trigger('click');
    expect(wrapper.emitted('activate')).toBeUndefined();
  });
});
