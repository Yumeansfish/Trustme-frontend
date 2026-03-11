<template>
  <div v-if="isVisible" :class="alertClasses" role="alert">
    <ui-button
      v-if="dismissible"
      type="button"
      class="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none opacity-60 transition hover:opacity-100"
      @click="dismiss"
    >
      ×
    </ui-button>
    <slot></slot>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'BAlert',
  props: {
    variant: { type: String, default: 'info' },
    show: { type: [Boolean, Number], default: false },
    dismissible: { type: Boolean, default: false },
  },
  emits: ['dismissed'],
  data() {
    return {
      dismissed: false,
    };
  },
  computed: {
    isVisible() {
      const visible = typeof this.show === 'number' ? this.show > 0 : !!this.show;
      return visible && !this.dismissed;
    },
    alertClasses() {
      const variants = {
        info: 'aw-alert-info',
        warning: 'aw-alert-warning',
        danger: 'aw-alert-danger',
        success: 'aw-alert-success',
      };

      return ['aw-alert', variants[this.variant] || variants.info];
    },
  },
  watch: {
    show() {
      if (this.show) {
        this.dismissed = false;
      }
    },
  },
  methods: {
    dismiss() {
      this.dismissed = true;
      this.$emit('dismissed');
    },
  },
});
</script>
