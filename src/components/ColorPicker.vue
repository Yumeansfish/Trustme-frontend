<template>
  <div ref="colorpicker" class="color-picker-wrapper">
    <div class="color-picker-input-group">
      <input
        type="text"
        v-model="colorValue"
        @focus="showPicker()"
        @input="updateFromInput"
        placeholder="#FF00FF"
        class="form-control"
      />
      <div class="color-picker-addon" @click="togglePicker()">
        <div class="current-color" :style="'background-color: ' + colorValue"></div>
      </div>
      <button class="color-picker-random" @click="randomColor()" title="Randomize">🎲</button>
    </div>
    <div v-if="displayPicker" class="color-picker-popover">
      <input type="color" :value="colorValue" @input="updateFromNativePicker" />
    </div>
  </div>
</template>

<style scoped>
.color-picker-wrapper {
  position: relative;
}
.color-picker-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.color-picker-input-group .form-control {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}
.color-picker-addon {
  cursor: pointer;
  padding: 4px;
}
.current-color {
  border-radius: 50%;
  height: 1.5em;
  width: 1.5em;
  border: 1px solid #ccc;
}
.color-picker-random {
  background: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  padding: 4px 8px;
}
.color-picker-popover {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 9;
  margin-top: 4px;
}
</style>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ColorPicker',
  props: { modelValue: { type: String, default: '#000000' } },
  emits: ['update:modelValue'],
  data() {
    return {
      colorValue: this.modelValue || '#000000',
      displayPicker: false,
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
    showPicker() {
      document.addEventListener('click', this.documentClick);
      this.displayPicker = true;
    },
    hidePicker() {
      document.removeEventListener('click', this.documentClick);
      this.displayPicker = false;
    },
    togglePicker() {
      this.displayPicker ? this.hidePicker() : this.showPicker();
    },
    updateFromInput() {
      // already handled by v-model
    },
    updateFromNativePicker(e) {
      this.colorValue = e.target.value;
    },
    randomColor() {
      this.colorValue = '#' + (0x1000000 + Math.random() * 0xffffff).toString(16).substr(1, 6);
    },
    documentClick(e) {
      const el = this.$refs.colorpicker;
      if (el && el !== e.target && !el.contains(e.target)) {
        this.hidePicker();
      }
    },
  },
});
</script>
