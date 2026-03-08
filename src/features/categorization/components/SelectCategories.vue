<template>
<div class="space-y-3">
  <select class="aw-select" v-model="selectedCategoryKeys" :disabled="options.length === 0" multiple size="6">
    <option v-for="option in options" :key="option.value" :value="option.value">{{ option.text }}</option>
  </select>
  <div class="flex flex-wrap gap-2" v-if="selectedCategoryKeys.length > 0"><span class="aw-chip" v-for="tag in selectedCategoryKeys" :key="tag"><span>{{ tag }}</span></span></div>
</div>
</template>

<script lang="typescript">
import { defineComponent } from 'vue';
import { useCategoryStore } from '~/features/categorization/store/categories';

const SEP = " > ";

export default defineComponent({
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      selectedCategoryKeys: [],
    };
  },

  computed: {
    options() {
      const classes = useCategoryStore().classes;
      return classes.map(category => ({
        value: category.name.join(SEP),
        text: category.name.join(SEP),
      }));
    },
  },

  watch: {
    modelValue: {
      immediate: true,
      handler(val) {
        this.selectedCategoryKeys = (val || []).map(v => v.join(SEP));
      },
    },
    selectedCategoryKeys(val) {
      const category_names = val.map(v => v.split(SEP));
      this.$emit('input', category_names);
      this.$emit('update:modelValue', category_names);
    },
  },
});
</script>
