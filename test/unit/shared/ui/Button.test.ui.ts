import { mount } from '@vue/test-utils';

import UiButton from '~/shared/ui/Button.vue';

describe('UiButton', () => {
  test('renders a disabled link as an inert element', async () => {
    const onClick = jest.fn();
    const wrapper = mount(UiButton, {
      props: { disabled: true, href: 'https://example.com' },
      attrs: { onClick },
      slots: { default: 'Open' },
    });

    expect(wrapper.element.tagName).toBe('SPAN');
    expect(wrapper.attributes('aria-disabled')).toBe('true');
    expect(wrapper.attributes('href')).toBeUndefined();

    await wrapper.trigger('click');
    expect(onClick).not.toHaveBeenCalled();
  });
});
