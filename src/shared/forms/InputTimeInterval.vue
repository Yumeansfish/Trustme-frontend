<template>
<div class="space-y-4">
  <div class="space-y-2">
    <aw-alert v-if="invalidDaterange" variant="warning" show>The selected date range is invalid. The second date must be greater or equal to the first date.</aw-alert>
    <aw-alert v-if="daterangeTooLong" variant="warning" show>The selected date range is too long. The maximum is {{ maxDuration/(24*60*60) }} days.</aw-alert>
  </div>
  <div class="aw-card flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div class="flex-1 space-y-4">
      <div class="space-y-2">
        <div class="aw-label">Show last</div>
        <div class="flex flex-wrap gap-2">
          <ui-button class="aw-btn aw-btn-sm" v-for="(dur, idx) in durations" :key="idx" type="button" @click="duration = dur.seconds; applyLastDuration()" :class="duration === dur.seconds && mode === 'last_duration' ? 'aw-btn-primary' : 'aw-btn-secondary'">
            <span v-html="dur.label"></span>
          </ui-button>
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-1"><span class="aw-label">Mode</span>
          <ui-select class="aw-select-sm" id="mode" v-model="mode" @change="valueChanged">
            <option value="last_duration">Last duration</option>
            <option value="range">Date range</option>
          </ui-select>
        </label>
        <label class="flex flex-col gap-1" v-if="mode == 'last_duration'"><span class="aw-label">Duration</span>
          <ui-select class="aw-select-sm" id="duration" v-model="duration" @change="valueChanged">
            <option :value="15*60">15min</option>
            <option :value="30*60">30min</option>
            <option :value="60*60">1h</option>
            <option :value="2*60*60">2h</option>
            <option :value="4*60*60">4h</option>
            <option :value="6*60*60">6h</option>
            <option :value="12*60*60">12h</option>
            <option :value="24*60*60">24h</option>
          </ui-select>
        </label>
      </div>
      <div class="aw-time-range-grid" v-if="mode == 'range'">
        <label class="flex flex-col gap-1"><span class="aw-label">Start</span>
          <ui-input class="aw-input-sm" type="date" v-model="start" />
        </label>
        <label class="flex flex-col gap-1"><span class="aw-label">End</span>
          <ui-input class="aw-input-sm" type="date" v-model="end" />
        </label>
        <div class="flex items-end">
          <ui-button class="aw-btn aw-btn-sm aw-btn-secondary w-full" type="button" :disabled="invalidDaterange || emptyDaterange || daterangeTooLong" @click="applyRange">Apply</ui-button>
        </div>
      </div>
    </div>
    <div class="space-y-2 text-sm text-foreground-muted" v-if="showUpdate">
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary w-full" type="button" @click="refresh()">
        <icon name="sync"></icon><span>Refresh</span>
      </ui-button>
      <div v-if="lastUpdate">Last update: {{ lastUpdate ? lastUpdate.fromNow() : '' }}</div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import moment from 'moment';

export default {
  name: 'input-timeinterval',
  props: {
    defaultDuration: {
      type: Number,
      default: 60 * 60,
    },
    maxDuration: {
      type: Number,
      default: null,
    },
    showUpdate: {
      type: Boolean,
      default: true,
    },
    modelValue: {
      type: Array,
      default: null,
    },
  },
  data() {
    return {
      duration: null as number | null,
      mode: 'last_duration' as 'last_duration' | 'range',
      start: null as string | null,
      end: null as string | null,
      lastUpdate: null as moment.Moment | null,
      lastUpdateTimer: null as any,
      durations: [
        { seconds: 0.25 * 60 * 60, label: '&frac14;h' },
        { seconds: 0.5 * 60 * 60, label: '&frac12;h' },
        { seconds: 60 * 60, label: '1h' },
        { seconds: 2 * 60 * 60, label: '2h' },
        { seconds: 3 * 60 * 60, label: '3h' },
        { seconds: 4 * 60 * 60, label: '4h' },
        { seconds: 6 * 60 * 60, label: '6h' },
        { seconds: 12 * 60 * 60, label: '12h' },
        { seconds: 24 * 60 * 60, label: '24h' },
        { seconds: 48 * 60 * 60, label: '48h' },
      ],
    };
  },
  computed: {
    value: {
      get(): [moment.Moment, moment.Moment] {
        if (this.mode === 'range' && this.start && this.end) {
          return [moment(this.start), moment(this.end).add(1, 'day')];
        } else {
          return [moment().subtract(this.duration!, 'seconds'), moment()];
        }
      },
    },
    emptyDaterange(): boolean {
      return !(this.start && this.end);
    },
    invalidDaterange(): boolean {
      return moment(this.start!).isAfter(moment(this.end!));
    },
    daterangeTooLong(): boolean {
      return moment(this.start!).add(this.maxDuration!, 'seconds').isBefore(moment(this.end!));
    },
  },
  mounted() {
    // Check if parent passed a valid daterange via v-model
    const modelValue = this.modelValue;
    if (
      Array.isArray(modelValue) &&
      moment.isMoment(modelValue[0]) &&
      modelValue[0].isValid() &&
      moment.isMoment(modelValue[1]) &&
      modelValue[1].isValid()
    ) {
      this.mode = 'range';
      this.start = modelValue[0].format('YYYY-MM-DD');
      this.end = modelValue[1].subtract(1, 'day').format('YYYY-MM-DD');
      this.lastUpdate = moment();
      this.valueChanged();
    } else {
      this.duration = this.defaultDuration;
      this.valueChanged();
    }

    this.lastUpdateTimer = setInterval(() => {
      this.lastUpdate = moment();
    }, 10 * 1000);
  },
  beforeUnmount() {
    clearInterval(this.lastUpdateTimer);
  },
  methods: {
    valueChanged() {
      if (
        this.mode === 'last_duration' ||
        (!this.emptyDaterange && !this.invalidDaterange && !this.daterangeTooLong)
      ) {
        this.lastUpdate = moment();
        this.$emit('update:modelValue', this.value);
      }
    },
    refresh() {
      const m = this.mode;
      this.mode = '';
      this.mode = m;
      this.valueChanged();
    },
    applyRange() {
      this.mode = 'range';
      this.duration = 0;
      this.valueChanged();
    },
    applyLastDuration() {
      this.mode = 'last_duration';
      this.valueChanged();
    },
  },
};
</script>
