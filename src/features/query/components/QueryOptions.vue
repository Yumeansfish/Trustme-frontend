<template>
<div class="grid gap-4 sm:grid-cols-2">
  <label class="flex flex-col gap-1"><span class="aw-label">Hostname</span>
    <select class="aw-select" v-model="queryOptionsData.hostname">
      <option v-for="hostname in hostnameChoices" :key="hostname" :value="hostname">{{hostname}}</option>
    </select>
  </label>
  <label class="flex flex-col gap-1"><span class="aw-label">Start</span>
    <input class="aw-input" type="date" v-model="queryOptionsData.start">
  </label>
  <label class="flex flex-col gap-1"><span class="aw-label">Stop</span>
    <input class="aw-input" type="date" v-model="queryOptionsData.stop">
  </label>
  <label class="aw-filter-tile sm:col-span-2">
    <input class="aw-checkbox" type="checkbox" v-model="queryOptionsData.filter_afk"><span>Exclude time away from computer</span>
  </label>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import moment from 'moment';
import { useBucketsStore } from '~/features/buckets/store/buckets';

export default defineComponent({
  name: 'QueryOptions',
  props: {
    modelValue: {
      type: Object,
      default: null,
    },
    queryOptions: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      bucketsStore: useBucketsStore(),

      queryOptionsData: {
        hostname: '',
        start: moment().subtract(1, 'day').format('YYYY-MM-DD'),
        stop: moment().add(1, 'day').format('YYYY-MM-DD'),
        filter_afk: true,
      },
    };
  },

  computed: {
    hostnameChoices() {
      return this.bucketsStore.hosts;
    },
  },

  watch: {
    queryOptionsData: {
      handler(value) {
        this.$emit('input', value);
        this.$emit('update:modelValue', value);
      },
      deep: true,
    },
  },

  async mounted() {
    await this.bucketsStore.ensureLoaded();
    this.queryOptionsData = {
      ...this.queryOptionsData,
      hostname: this.hostnameChoices[0],
      ...(this.modelValue || this.queryOptions || {}),
    };
    this.$emit('input', this.queryOptionsData);
    this.$emit('update:modelValue', this.queryOptionsData);
  },
});
</script>
