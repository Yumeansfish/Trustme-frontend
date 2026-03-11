<template>
  <component :is="componentTag" v-bind="componentProps" :class="buttonClasses">
    <slot />
  </component>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { RouterLink } from 'vue-router';

export default defineComponent({
  name: 'UiButton',
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
    type: {
      type: String,
      default: 'button',
    },
    variant: {
      type: String,
      default: 'secondary',
    },
    size: {
      type: String,
      default: 'md',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs }) {
    const componentTag = computed(() => {
      if (props.to) return RouterLink;
      if (props.href) return 'a';
      return 'button';
    });

    const buttonClasses = computed(() => {
      const className = String(attrs.class || '');
      if (
        className.includes('aw-btn') ||
        className.includes('aw-icon-button') ||
        className.includes('aw-segmented-item')
      ) {
        return [attrs.class];
      }

      if (props.variant === 'ghost') {
        const ghostSizes: Record<string, string> = {
          icon: 'h-9 w-9',
          'icon-sm': 'h-8 w-8',
          'icon-xs': 'h-7 w-7',
        };
        return ['aw-icon-button', ghostSizes[props.size] || 'h-9 w-9', attrs.class];
      }

      const variants: Record<string, string> = {
        primary: 'aw-btn-primary',
        secondary: 'aw-btn-secondary',
        success: 'aw-btn-success',
        danger: 'aw-btn-danger',
        warning: 'aw-btn-warning',
        outline: 'aw-btn-outline',
      };
      const sizes: Record<string, string> = {
        sm: 'aw-btn-sm',
        md: 'aw-btn-md',
        lg: 'aw-btn-lg',
      };

      return [
        'aw-btn',
        sizes[props.size] || sizes.md,
        variants[props.variant] || variants.secondary,
        attrs.class,
      ];
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

      if (props.href) {
        return {
          ...baseAttrs,
          href: props.href,
          'aria-disabled': props.disabled ? 'true' : undefined,
        };
      }

      return {
        ...baseAttrs,
        type: props.type,
        disabled: props.disabled,
      };
    });

    return {
      buttonClasses,
      componentProps,
      componentTag,
    };
  },
});
</script>
