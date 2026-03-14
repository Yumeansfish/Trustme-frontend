<template>
<div>
  <aw-alert v-if="isPollVisible" variant="info" show>
    <div class="flex items-start justify-between gap-3">
      <form class="flex-1 space-y-4">
        <p>Hey there! You've been using trust-me for a while. How likely are you to recommend it to a friend or colleague on a scale from 1 to 10?</p>
        <div class="grid grid-cols-5 gap-2 sm:grid-cols-10">
          <label class="aw-rating-option flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-base bg-surface p-2 text-sm transition" v-for="i in options" :key="i" :for="'option' + i" :class="Number(rating) === i ? 'aw-rating-option-active' : ''">
            <ui-radio-item class="sr-only" :id="'option' + i" name="rating" :value="i" v-model="rating"  /><span class="font-medium">{{ i }}</span>
          </label>
        </div>
        <div class="flex items-center justify-between"><ui-link class="aw-link text-sm" @click.prevent="dontShowAgain" href="#">Don't show again</ui-link>
          <ui-button class="aw-btn aw-btn-sm aw-btn-primary" type="submit" @click.prevent="submit">Submit</ui-button>
        </div>
      </form>
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary shrink-0" type="button" @click="isPollVisible=false">×</ui-button>
    </div>
  </aw-alert>
  <aw-alert v-if="isPosFollowUpVisible" variant="info" show>
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 space-y-3">
        <p>We're happy to hear you enjoy using trust-me, but we can do better.<br>To help us improve, here are a few things you can do:</p>
        <ul class="list-disc space-y-1 pl-5 text-sm">
          <li>Open an issue on <ui-link href="https://github.com/Yumeansfish/Trustme-backend/issues">GitHub</ui-link>.</li>
          <li>Share feedback directly with the research team.</li>
          <li>Download the latest build from the <ui-link href="https://yumeansfish.github.io/Trustme-backend/">release page</ui-link> when asked to test a newer version.</li>
        </ul>
      </div>
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary shrink-0" type="button" @click="isPosFollowUpVisible=false">×</ui-button>
    </div>
  </aw-alert>
  <aw-alert v-if="isNegFollowUpVisible" variant="info" show>
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 space-y-3">
        <p>We are sorry to hear that trust-me did not work well for you. We would be very thankful if you helped us by:</p>
        <ul class="list-disc space-y-1 pl-5 text-sm">
          <li>Filling out the <ui-link href="https://forms.gle/q2N9K5RoERBV8kqPA">feedback form</ui-link>.</li>
          <li>Opening an issue on <ui-link href="https://github.com/Yumeansfish/Trustme-backend/issues">GitHub</ui-link>.</li>
        </ul>
      </div>
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary shrink-0" type="button" @click="isNegFollowUpVisible=false">×</ui-button>
    </div>
  </aw-alert>
</div>
</template>

<script lang="ts">
import { range } from 'lodash/fp';
import moment from 'moment';

import { useSettingsStore } from '~/features/settings/store/settings';

const NUM_OPTIONS = 10;
// BACKOFF_PERIOD is how many seconds to wait to show the poll again if the user closed it
const BACKOFF_PERIOD = 7 * 24 * 60 * 60;
// The following may be used for testing
// const INITIAL_WAIT_PERIOD = 1;
// const BACKOFF_PERIOD = 1;

export default {
  name: 'user-satisfaction-poll',
  data() {
    return {
      isPollVisible: false,
      isPosFollowUpVisible: false,
      isNegFollowUpVisible: false,
      // options is an array of [1, ..., NUM_OPTIONS]
      options: range(1, NUM_OPTIONS + 1),
      rating: null,
    };
  },
  computed: {
    data: {
      get() {
        const settingsStore = useSettingsStore();
        return settingsStore.userSatisfactionPollData;
      },
      set(value) {
        const settingsStore = useSettingsStore();
        const data = settingsStore.userSatisfactionPollData;
        settingsStore.update({
          userSatisfactionPollData: { ...data, ...value },
        });
      },
    },
  },
  async mounted() {
    if (!this.data.isEnabled) {
      return;
    }

    // Show poll if enough time has passed
    if (moment() >= moment(this.data.nextPollTime)) {
      this.data.timesPollIsShown = this.data.timesPollIsShown + 1;
      this.isPollVisible = true;
      this.data.nextPollTime = moment().add(BACKOFF_PERIOD, 'seconds');
    }

    // Show the poll a maximum of 3 times
    if (this.data.timesPollIsShown > 2) {
      this.data.isEnabled = false;
    }
  },
  methods: {
    submit() {
      this.isPollVisible = false;
      this.data = { ...this.data, isEnabled: false };

      if (parseInt(this.rating) >= 6) {
        this.isPosFollowUpVisible = true;
      } else {
        this.isNegFollowUpVisible = true;
      }
    },
    dontShowAgain() {
      this.isPollVisible = false;
      this.data = { ...this.data, isEnabled: false };
    },
  },
};
</script>
