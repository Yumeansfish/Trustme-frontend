import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import AppModal from '~/shared/ui/AppModal.vue';
import UiButton from '~/shared/ui/Button.vue';

describe('AppModal', () => {
  test('traps focus, closes with Escape, and restores previous focus', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const wrapper = mount(AppModal, {
      attachTo: document.body,
      props: { open: true, title: 'Edit event' },
      slots: {
        default: '<button id="modal-last">Last action</button>',
      },
      global: {
        components: { UiButton },
        stubs: { teleport: true },
      },
    });

    await nextTick();
    await nextTick();
    const closeButton = wrapper.get('[aria-label="Close modal"]');
    const lastButton = wrapper.get('#modal-last');
    expect(document.activeElement).toBe(closeButton.element);

    (lastButton.element as HTMLElement).focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(closeButton.element);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);

    await wrapper.setProps({ open: false });
    await nextTick();
    expect(document.activeElement).toBe(opener);
    wrapper.unmount();
    opener.remove();
  });
});
