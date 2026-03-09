<template>
<div class="grid gap-4 sm:grid-cols-2">
  <label class="flex flex-col gap-1"><span class="aw-label">Hostname</span>
    <ui-select class="aw-select" v-model="queryOptionsData.hostname">
      <option v-for="hostname in hostnameChoices" :key="hostname" :value="hostname">{{hostname}}</option>
    </ui-select>
  </label>
  <label class="flex flex-col gap-1"><span class="aw-label">Start</span>
    <ui-input class="aw-input" type="date" v-model="queryOptionsData.start" />
  </label>
  <label class="flex flex-col gap-1"><span class="aw-label">Stop</span>
    <ui-input class="aw-input" type="date" v-model="queryOptionsData.stop" />
  </label>
  <label class="aw-filter-tile sm:col-span-2">
    <ui-checkbox class="aw-checkbox" v-model="queryOptionsData.filter_afk"  /><span>Exclude time away from computer</span>
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
    preferredHostname() {
      const nonUnknownHosts = this.hostnameChoices.filter(
        hostname => hostname && hostname !== 'unknown'
      );
      const hostWithCategoryData = nonUnknownHosts.find(
        hostname => this.bucketsStore.available(hostname).category
      );

      return hostWithCategoryData || nonUnknownHosts[0] || this.hostnameChoices[0] || '';
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
    const incomingOptions = this.modelValue || this.queryOptions || {};
    this.queryOptionsData = {
      ...this.queryOptionsData,
      ...incomingOptions,
      hostname:
        incomingOptions.hostname && incomingOptions.hostname !== 'unknown'
          ? incomingOptions.hostname
          : this.preferredHostname,
    };
    this.$emit('input', this.queryOptionsData);
    this.$emit('update:modelValue', this.queryOptionsData);
  },
});
</script>
