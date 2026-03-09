<template>
<div>
  <aw-alert v-if="isVisible" variant="info" show>
    <div class="flex items-start justify-between gap-3">
      <p class="pr-2">A new release, v{{ latestVersion }}, is available for<ui-link class="aw-link" href="https://activitywatch.net/downloads/" target="_blank">download</ui-link>, you can also<ui-link class="aw-link" href="javascript:void(0);" @click="disableCheck">disable</ui-link>future reminders and checks for updates.</p>
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary shrink-0" type="button" @click="isVisible=false">×</ui-button>
    </div>
  </aw-alert>
  <aw-alert v-if="isFollowUpVisible" variant="success" show>
    <div class="flex items-start justify-between gap-3">
      <p class="pr-2">Checking for new releases is now disabled, you can re-enable it in the
        <ui-link class="aw-link-success" to="/settings" @click="isFollowUpVisible=false">settings page</ui-link>.
      </p>
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary shrink-0" type="button" @click="isFollowUpVisible=false">×</ui-button>
    </div>
  </aw-alert>
</div>
</template>

<script lang="ts">
import axios from 'axios';
import moment from 'moment';
import semver from 'semver';
import { mapWritableState } from 'pinia';

import { useSettingsStore, LONG_BACKOFF_PERIOD, SHORT_BACKOFF_PERIOD } from '~/features/settings/store/settings';
import { getClient } from '~/app/lib/awclient';

// After reminding the user every SHORT_BACKOFF_PERIOD days for BACKOFF_THRESHOLD times, switch to LONG_BACKOFF_PERIOD
const BACKOFF_THRESHOLD = 5;

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'new-release-notification',
  data() {
    return {
      isVisible: false,
      isFollowUpVisible: false,
      currentVersion: null,
      latestVersion: null,
      latestVersionDate: null,
      // The following constants can be used in other files, such as ReleaseNotificationSettings.vue
      SHORT_BACKOFF_PERIOD: SHORT_BACKOFF_PERIOD,
      LONG_BACKOFF_PERIOD: LONG_BACKOFF_PERIOD,
    };
  },
  computed: {
    ...mapWritableState(useSettingsStore, { data: 'newReleaseCheckData' }),
  },
  async mounted() {
    await useSettingsStore().ensureLoaded();
    if (this.data && (!this.data.isEnabled || moment() < moment(this.data.nextCheckTime))) return;

    await this.retrieveCurrentVersion();
    await this.retrieveLatestVersion();
    this.isVisible = this.getHasNewRelease() && this.getReleaseIsReady();

    if (this.isVisible && this.data) {
      const _timesChecked = Math.min(this.data.timesChecked + 1, BACKOFF_THRESHOLD);
      const _howOftenToCheck =
        _timesChecked > BACKOFF_THRESHOLD - 1 ? LONG_BACKOFF_PERIOD : SHORT_BACKOFF_PERIOD;
      this.data = {
        isEnabled: true,
        nextCheckTime: moment().add(_howOftenToCheck, 'seconds'),
        howOftenToCheck: _howOftenToCheck,
        timesChecked: _timesChecked,
      };
    } else {
      this.data = {
        isEnabled: true,
        nextCheckTime: moment().add(SHORT_BACKOFF_PERIOD, 'seconds'),
        howOftenToCheck: SHORT_BACKOFF_PERIOD,
        timesChecked: this.isVisible ? 1 : 0,
      };
    }
  },
  methods: {
    async retrieveCurrentVersion() {
      try {
        const response = await getClient().getInfo();
        this.currentVersion = this.cleanVersionTag(response.version);
      } catch (err) {
        console.error('unable to connect to aw-server: ', err);
      }
    },
    async retrieveLatestVersion() {
      try {
        const response = await axios.get(
          'https://api.github.com/repos/ActivityWatch/activitywatch/releases/latest'
        );
        this.latestVersion = this.cleanVersionTag(response.data.tag_name);
        this.latestVersionDate = moment(response.data.published_at);
      } catch (err) {
        console.error('unable to connect to GitHub API to check for latest version: ', err);
      }
    },
    cleanVersionTag(tag) {
      tag = tag.trim();

      // Remove the build metadata if it exists, e.g. 'v0.8.dev+c6433ea'
      const plus_idx = tag.indexOf('+');
      tag = tag.substring(0, plus_idx != -1 ? plus_idx : tag.length);
      // Remove server type if it exists, e.g. 'v0.8.0 (rust)'
      const space_idx = tag.indexOf(' ');
      tag = tag.substring(0, space_idx != -1 ? space_idx : tag.length);

      return semver.valid(tag);
    },
    getHasNewRelease() {
      // Null version means format was invalid, so fail silently and not show reminder
      if (this.currentVersion && this.latestVersion)
        return semver.lt(this.currentVersion, this.latestVersion);
      return false;
    },
    getReleaseIsReady() {
      // Want to make sure that the latest release is out for a week to make sure it's well tested
      if (this.latestVersionDate) return moment() >= this.latestVersionDate.add(7, 'days');
      return false;
    },
    disableCheck() {
      this.isVisible = false;
      this.isFollowUpVisible = true;
      this.data.isEnabled = false;
      this.saveData();
    },
  },
});
</script>
