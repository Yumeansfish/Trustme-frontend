<template lang="pug">
div
  div
    b-alert(v-if="invalidDaterange", variant="warning", show)
      | The selected date range is invalid. The second date must be greater or equal to the first date.
    b-alert(v-if="daterangeTooLong", variant="warning", show)
      | The selected date range is too long. The maximum is {{ maxDuration/(24*60*60) }} days.

  div.d-flex.justify-content-between
    table
      tr
        td.pr-2
          label.col-form-label.col-form-label-sm Show last
        td(colspan=2)
          .btn-group(role="group")
            template(v-for="(dur, idx) in durations")
              input(
                type="radio"
                :id="'dur' + idx"
                :value="dur.seconds"
                v-model="duration"
                @change="applyLastDuration"
              ).d-none
              label(:for="'dur' + idx" v-html="dur.label").btn.btn-light.btn-sm

      tr
        td.pr-2
          label.col-form-label.col-form-label-sm Show from
        td
          select(id="mode", v-model="mode", @change="valueChanged")
            option(value='last_duration') Last duration
            option(value='range') Date range
      tr(v-if="mode == 'last_duration'")
        th.pr-2
          label(for="duration") Show last:
        td
          select(id="duration", v-model="duration", @change="valueChanged")
            option(:value="15*60") 15min
            option(:value="30*60") 30min
            option(:value="60*60") 1h
            option(:value="2*60*60") 2h
            option(:value="4*60*60") 4h
            option(:value="6*60*60") 6h
            option(:value="12*60*60") 12h
            option(:value="24*60*60") 24h
      tr(v-if="mode == 'range'")
        th.pr-2 Range:
        td
          input(type="date", v-model="start")
          input(type="date", v-model="end")
          button(
            class="btn btn-outline-dark btn-sm",
            type="button",
            :disabled="invalidDaterange || emptyDaterange || daterangeTooLong",
            @click="applyRange"
          ) Apply

    div.text-muted.d-none.d-md-block(style="text-align:right" v-if="showUpdate")
      b-button.mt-2.px-2(@click="refresh()", variant="outline-dark", size="sm", style="opacity: 0.7")
        icon(name="sync")
        span.d-none.d-md-inline
          | Refresh
      div.mt-2.small(v-if="lastUpdate")
        | Last update: #[time(:datetime="lastUpdate.format()") {{lastUpdate | friendlytime}}]
</template>

<style scoped lang="scss">
.btn-group {
  input[type='radio']:checked + label {
    background-color: #aaa;
  }
}
</style>

<script lang="ts">
import moment from 'moment';
import 'vue-awesome/icons/sync';

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
  },
  data() {
    return {
      duration: null as number | null,
      mode: 'last_duration' as 'last_duration' | 'range',
      start: null as string | null,
      end: null as string | null,
      lastUpdate: null as moment.Moment | null,
      durations: [
        { seconds: 0.25 * 60 * 60, label: '&frac14;h' },
        { seconds: 0.5 * 60 * 60,  label: '&frac12;h' },
        { seconds: 60 * 60,       label: '1h' },
        { seconds: 2 * 60 * 60,   label: '2h' },
        { seconds: 3 * 60 * 60,   label: '3h' },
        { seconds: 4 * 60 * 60,   label: '4h' },
        { seconds: 6 * 60 * 60,   label: '6h' },
        { seconds: 12 * 60 * 60,  label: '12h' },
        { seconds: 24 * 60 * 60,  label: '24h' },
        { seconds: 48 * 60 * 60,  label: '48h' },
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
      return moment(this.start!)
        .add(this.maxDuration!, 'seconds')
        .isBefore(moment(this.end!));
    },
  },
  mounted() {
    if (
      Array.isArray(this.value) &&
      this.value[0].isValid() &&
      this.value[1].isValid()
    ) {
      this.mode = 'range';
      this.start = this.value[0].format('YYYY-MM-DD');
      this.end   = this.value[1].format('YYYY-MM-DD');
      this.lastUpdate = moment();
    } else {
      this.duration = this.defaultDuration;
      this.valueChanged();
    }

    this.lastUpdateTimer = setInterval(() => {
      const tmp = this.lastUpdate;
      this.lastUpdate = null;
      this.lastUpdate = tmp;
    }, 500);
  },
  beforeDestroy() {
    clearInterval(this.lastUpdateTimer);
  },
  methods: {
    valueChanged() {
      if (
        this.mode === 'last_duration' ||
        (!this.emptyDaterange && !this.invalidDaterange && !this.daterangeTooLong)
      ) {
        this.lastUpdate = moment();
        this.$emit('input', this.value);
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



