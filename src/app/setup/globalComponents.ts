import type { App as VueApp } from 'vue';
import Icon from '~/shared/ui/Icon.vue';
import BAlert from '~/shared/ui/BAlert.vue';
import UiButton from '~/shared/ui/Button.vue';
import UiCheckbox from '~/shared/ui/Checkbox.vue';
import UiInput from '~/shared/ui/Input.vue';
import UiLink from '~/shared/ui/Link.vue';
import UiSelect from '~/shared/ui/Select.vue';
import UiTextarea from '~/shared/ui/Textarea.vue';

export function registerGlobalComponents(app: VueApp): void {
  app.component('icon', Icon);
  app.component('aw-alert', BAlert);
  app.component('ui-button', UiButton);
  app.component('ui-checkbox', UiCheckbox);
  app.component('ui-input', UiInput);
  app.component('ui-link', UiLink);
  app.component('ui-select', UiSelect);
  app.component('ui-textarea', UiTextarea);
}
