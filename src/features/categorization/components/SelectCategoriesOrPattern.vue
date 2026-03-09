<template>
<div class="space-y-3">
  <label class="flex flex-col gap-1"><span class="aw-label">Filter mode</span>
    <ui-select class="aw-select" v-model="mode">
      <option value="custom">Custom regex</option>
      <option value="categories">Use existing categories</option>
    </ui-select>
  </label>
  <aw-select-categories v-if="mode == 'categories'" v-model="filterCategoriesData"></aw-select-categories>
  <div class="flex items-center gap-3" v-else>
    <ui-input class="aw-input flex-1" v-model="pattern" v-on:keyup.enter="generate()" placeholder="Regex pattern to search for" />
    <slot name="input-group-append"></slot>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useCategoryStore } from '~/features/categorization/store/categories';

const SEP = ' > ';

export default defineComponent({
  name: 'SelectCategoriesOrPattern',
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
    filterCategories: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      mode: 'categories',
      pattern: '',
      filterCategoriesData: [],
    };
  },
  computed: {
    categories: function () {
      return useCategoryStore().classes;
    },

    categoriesWithRules() {
      if (this.mode === 'categories') {
        // Get the category and all subcategories
        return this.categories
          .filter(cat => {
            const name = cat.name.join(SEP);
            for (const filterCat of this.filterCategoriesData) {
              if (name.includes(filterCat.join(SEP))) {
                return true;
              }
            }
            return false;
          })
          .filter(cat => cat.rule.type === 'regex')
          .map(cat => [cat.name, cat.rule]);
      } else if (this.mode === 'custom') {
        return [[['searched'], { type: 'regex', regex: this.pattern }]];
      } else {
        console.error('Unknown mode:', this.mode);
        return [];
      }
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(value) {
        if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
          this.filterCategoriesData = value.map(v => (Array.isArray(v) ? v : []));
        }
      },
    },
    filterCategories() {
      this.filterCategoriesData = [...this.filterCategoriesData, ...this.filterCategories];
    },
    filterCategoriesData() {
      this.$emit('input', this.categoriesWithRules);
      this.$emit('update:modelValue', this.categoriesWithRules);
      console.log(this.categoriesWithRules);
    },
    pattern() {
      this.$emit('input', this.categoriesWithRules);
      this.$emit('update:modelValue', this.categoriesWithRules);
      console.log(this.categoriesWithRules);
    },
  },
  async mounted() {
    await useCategoryStore().load();
  },
});
</script>
