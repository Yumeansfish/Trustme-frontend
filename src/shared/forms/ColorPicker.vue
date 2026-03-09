<template>
  <div class="flex items-center gap-2">
    <ui-input
      type="text"
      v-model="colorValue"
      @input="updateFromInput"
      placeholder="#FF00FF"
      class="aw-input flex-1"
    />
    <ui-input
      type="color"
      :value="colorValue"
      @input="updateFromNativePicker"
      class="h-10 w-10 cursor-pointer rounded-md border border-base bg-surface p-1 shadow-sm"
      aria-label="Pick color"
    />
    <ui-button type="button" class="aw-btn aw-btn-md aw-btn-secondary" @click="randomColor()" title="Randomize">
      🎲
    </ui-button>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ColorPicker',
  props: { modelValue: { type: String, default: '#000000' } },
  emits: ['update:modelValue'],
  data() {
    return {
      colorValue: this.modelValue || '#000000',
    };
  },
  watch: {
    modelValue(val) {
      if (val && val !== this.colorValue) {
        this.colorValue = val;
      }
    },
    colorValue(val) {
      if (val) {
        this.$emit('update:modelValue', val);
      }
    },
  },
  methods: {
    updateFromInput() {},
    updateFromNativePicker(e) {
      this.colorValue = e.target.value;
    },
    randomColor() {
      this.colorValue = '#' + (0x1000000 + Math.random() * 0xffffff).toString(16).substr(1, 6);
    },
  },
});
</script>
