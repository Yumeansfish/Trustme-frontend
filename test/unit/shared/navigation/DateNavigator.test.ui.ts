import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import DateNavigator from '~/shared/navigation/DateNavigator.vue';
import UiButton from '~/shared/ui/Button.vue';

describe('DateNavigator', () => {
  test('renders one or two check-in dots, and no dot for insight-only dates', async () => {
    const wrapper = mount(DateNavigator, {
      props: { modelValue: '2026-07-15', fieldMode: true,
        markedDates: ['2026-07-14', '2026-07-15', '2026-07-16'],
        markerCounts: { '2026-07-14': 1, '2026-07-15': 2 } },
      global: { components: { UiButton }, stubs: { icon: true } },
    });
    await wrapper.get('.aw-date-nav-trigger').trigger('click');
    expect(wrapper.get('[data-date="2026-07-14"]').findAll('.aw-date-dot')).toHaveLength(1);
    expect(wrapper.get('[data-date="2026-07-15"]').findAll('.aw-date-dot')).toHaveLength(2);
    expect(wrapper.get('[data-date="2026-07-16"]').findAll('.aw-date-dot')).toHaveLength(0);
    wrapper.unmount();
  });
  test('moves focus between available dates with arrow keys', async () => {
    const wrapper = mount(DateNavigator, {
      attachTo: document.body,
      props: {
        modelValue: '2026-07-15',
        min: '2026-07-15',
        max: '2026-07-16',
        availableDates: ['2026-07-15', '2026-07-16'],
        fieldMode: true,
      },
      global: {
        components: { UiButton },
        stubs: { icon: true },
      },
    });

    await wrapper.get('.aw-date-nav-trigger').trigger('click');
    await nextTick();
    await nextTick();

    const selected = wrapper.get('[data-date="2026-07-15"]');
    expect(document.activeElement).toBe(selected.element);
    await selected.trigger('keydown', { key: 'ArrowRight' });
    await nextTick();

    expect((document.activeElement as HTMLElement).dataset.date).toBe('2026-07-16');
    wrapper.unmount();
  });

  test('marks dates independently from selection and availability', async () => {
    const wrapper = mount(DateNavigator, {
      props: {
        modelValue: '',
        max: '2026-07-16',
        markedDates: ['2026-07-15'],
        fieldMode: true,
      },
      global: {
        components: { UiButton },
        stubs: { icon: true },
      },
    });

    await wrapper.get('.aw-date-nav-trigger').trigger('click');
    await nextTick();

    expect(wrapper.get('[data-date="2026-07-15"]').classes()).toContain('aw-date-cell-marked');
    expect(wrapper.get('[data-date="2026-07-16"]').classes()).not.toContain(
      'aw-date-cell-marked'
    );
  });
});
