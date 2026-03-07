<template>
  <div v-if="show" :class="alertClasses" role="alert">
    <button v-if="dismissible" type="button" class="alert-close" @click="dismiss">&times;</button>
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
    alertClasses() {
      return ['aw-alert', `aw-alert-${this.variant}`];
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

<style scoped>
.aw-alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
  position: relative;
}
.aw-alert-info {
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}
.aw-alert-warning {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}
.aw-alert-danger {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.aw-alert-success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}
.alert-close {
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
}
.alert-close:hover {
  opacity: 1;
}
</style>
