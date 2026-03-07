<template>
  <div v-if="isVisible" :class="alertClasses" role="alert">
    <button
      v-if="dismissible"
      type="button"
      class="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none opacity-60 transition hover:opacity-100"
      @click="dismiss"
    >
      ×
    </button>
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
        info: 'border-blue-200 bg-blue-50 text-blue-900',
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        danger: 'border-rose-200 bg-rose-50 text-rose-900',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      };

      return [
        'relative mb-3 rounded-lg border px-4 py-3 text-sm leading-6',
        variants[this.variant] || variants.info,
      ];
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
