<template>
  <component :is="componentTag" v-bind="componentProps" :class="linkClasses">
    <slot />
  </component>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { RouterLink } from 'vue-router';

export default defineComponent({
  name: 'UiLink',
  inheritAttrs: false,
  props: {
    to: {
      type: [String, Object],
      default: null,
    },
    href: {
      type: String,
      default: '',
    },
    variant: {
      type: String,
      default: 'none',
    },
  },
  setup(props, { attrs }) {
    const componentTag = computed(() => (props.to ? RouterLink : 'a'));

    const linkClasses = computed(() => {
      if (props.variant === 'none') {
        return attrs.class ? [attrs.class] : ['aw-link'];
      }

      const variants: Record<string, string> = {
        none: '',
        default: 'aw-link',
        success: 'aw-link-success',
        danger: 'aw-link-danger',
        muted: 'aw-link-muted',
        nav: '',
      };
      return [variants[props.variant] ?? variants.default, attrs.class];
    });

    const componentProps = computed(() => {
      const baseAttrs = { ...attrs };
      delete baseAttrs.class;
      if (props.to) {
        return {
          ...baseAttrs,
          to: props.to,
        };
      }
      return {
        ...baseAttrs,
        href: props.href || '#',
      };
    });

    return {
      componentProps,
      componentTag,
      linkClasses,
    };
  },
});
</script>
