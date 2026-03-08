<template>
<div class="space-y-6">
  <h1 class="aw-section-title">Categorization helper</h1>
  <div class="space-y-3">
    <p class="aw-caption">This tool will help you create categories from your uncategorized time.</p>
    <p class="aw-caption">
      It works by fetching all uncategorized time for a recent timeperiod,
      and then finds the most common words (by time, not count) each of
      which may then either be ignored (if too broad/irrelevant), or used
      to create a new (sub)category, or to append the word to a pre-existing category rule.
      Words with less than 60s of time will not be shown.
    </p>
    <p class="aw-caption">When you're done, you can inspect the categories in the 
      <router-link class="aw-link" :to="{ path: '/settings' }">Settings</router-link> page.
    </p>
  </div>
  <div class="aw-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1">
      <div class="text-sm font-semibold text-foreground-strong">Options</div>
      <div class="text-sm text-foreground-muted">Hostname: {{ queryOptions.hostname }}</div>
      <div class="text-sm text-foreground-muted">Range: {{ queryOptions.start }} - {{ queryOptions.stop }}</div>
    </div>
    <button class="aw-btn aw-btn-sm aw-btn-secondary" type="button" @click="show_options = !show_options"><span v-if="!show_options">Show options</span><span v-else>Hide options</span></button>
  </div>
  <div class="aw-card-muted" v-show="show_options">
    <h4 class="aw-subtitle">Options</h4>
    <aw-query-options v-model="queryOptions"></aw-query-options>
  </div>
  <div class="aw-divider"></div>
  <h5 class="aw-subtitle">Common words in "{{category.join(" > ")}}" events</h5>
  <div class="aw-empty" v-if="loading">Loading...</div>
  <div v-else>
    <div class="aw-empty" v-if="words_by_duration.length == 0">No words with significant duration. You're good to go!</div>
    <div class="space-y-3" v-else>
      <div class="aw-card" v-for="word in words_by_duration">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="text-sm font-medium text-foreground-strong">{{ word.word }} ({{ Math.round(word.duration) }}s)</div>
          <div class="flex flex-wrap items-center gap-2">
            <button class="aw-btn aw-btn-sm aw-btn-success" type="button" @click="createRule(word.word)">New rule</button>
            <button class="aw-btn aw-btn-sm aw-btn-warning" type="button" @click="appendRule(word.word)">Append rule</button>
            <button class="aw-btn aw-btn-sm aw-btn-secondary" type="button" @click="ignoreWord(word.word)">Ignore</button>
            <button class="aw-btn aw-btn-sm aw-btn-outline" type="button" @click="showEvents(word)"><span v-if="showing_events[0] != word">Show events</span><span v-else>Hide events</span></button>
          </div>
        </div>
        <div class="mt-4 overflow-x-auto" v-if="showing_events && showing_events[0] == word">
          <table class="aw-table">
            <thead>
              <tr>
                <th>Title</th>
                <th class="text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="event in showing_events[1]">
                <td>{{ event.data.title }}</td>
                <td class="text-right">{{ Math.round(event.duration) }}s</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  <div v-if="create.categoryId !== null">
    <CategoryEditModal :categoryId="create.categoryId" @ok="createRuleOk()" @hidden="createRuleCancel()"></CategoryEditModal>
  </div>
  <app-modal :open="isAppendRuleOpen" title="Append rule" panel-class="max-w-lg" @update:open="onAppendRuleOpenChange">
    <div class="space-y-4">
      <label class="flex flex-col gap-1"><span class="aw-label">Category</span>
        <select class="aw-select" id="append-category" v-model="append.category">
          <option v-for="cat in allCategoriesSelect" :value="cat.value" :key="cat.text">{{ cat.text }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1"><span class="aw-label">Word</span>
        <input class="aw-input" v-model="append.word" type="text" @keydown.enter.prevent="handleSubmit">
      </label>
      <div class="text-sm">
        <div class="text-success" v-if="validPattern && !broad_pattern">Pattern looks good</div>
        <div class="text-danger" v-else-if="!validPattern">Invalid pattern</div>
        <div class="text-warning" v-else>Pattern too broad</div>
      </div>
    </div>
    <template #footer>
      <button class="aw-btn aw-btn-md aw-btn-secondary" type="button" @click="closeAppendRule">Cancel</button>
      <button class="aw-btn aw-btn-md aw-btn-primary disabled:cursor-not-allowed disabled:opacity-50" type="button" :disabled="!valid" @click="handleSubmit">Append rule</button>
    </template>
  </app-modal>
</div>
</template>

<script lang="ts">
import _ from 'lodash';
import moment from 'moment';
import { mapState } from 'pinia';

import { useCategoryStore } from '~/features/categorization/store/categories';
import { useBucketsStore } from '~/features/buckets/store/buckets';

import { canonicalEvents } from '~/app/lib/queries';
import { getClient } from '~/app/lib/awclient';
import CategoryEditModal from '~/features/categorization/components/CategoryEditModal.vue';
import AppModal from '~/shared/ui/AppModal.vue';
import { isRegexBroad, validateRegex } from '~/shared/lib/validate';

export default {
  name: 'aw-category-builder',
  components: { CategoryEditModal, AppModal },
  props: {},
  data() {
    return {
      loading: true,

      categoryStore: useCategoryStore(),

      // Options
      show_options: false,
      queryOptions: {
        start: moment().subtract(1, 'day'),
        stop: moment().add(1, 'day'),
      },

      // TODO: Support inspecting a different category than Uncategorized (e.g. to make some category more precise)
      category: ['Uncategorized'],

      words: {},
      showing_events: [],

      // TODO: load from settings
      ignored_words: [],

      append: {
        word: '',
        category: [],
      },
      isAppendRuleOpen: false,
      create: {
        word: '',
        categoryId: null,
      },
    };
  },
  computed: {
    ...mapState(useCategoryStore, ['allCategoriesSelect']),
    words_by_duration: function () {
      const words: { word: string; duration: number }[] = [...this.words.values()];
      return words
        .sort((a, b) => b.duration - a.duration)
        .filter(word => word.duration > 60)
        .filter(word => !this.ignored_words.includes(word.word));
    },
    valid: function () {
      return this.validPattern && this.validCategory;
    },
    validPattern: function () {
      return validateRegex(this.append.word);
    },
    validCategory: function () {
      return this.append.category.length > 0;
    },
    broad_pattern: function () {
      return isRegexBroad(this.append.word);
    },
  },
  watch: {
    queryOptions: {
      handler: function () {
        this.fetchWords();
      },
      deep: true,
    },
  },
  async mounted() {
    // Make sure we don't have stale unsaved changes in categoryStore
    await useBucketsStore().ensureLoaded();
    await this.categoryStore.load();
    // Called by watch
    //await this.fetchWords();
  },
  methods: {
    async fetchWords() {
      this.loading = true;
      if (!this.queryOptions.hostname) {
        // FIXME: This is a hack to ensure that the hostname is set (otherwise isn't due to some race condition)
        // Don't ever return the "unknown" hostname
        // TODO: ideally, only choose a hostname that has the right buckets
        this.queryOptions.hostname = _.filter(
          useBucketsStore().hosts,
          host => host !== 'unknown'
        )[0];
      }
      await this.categoryStore.load();
      const awclient = getClient();
      const query =
        canonicalEvents({
          bid_window: 'aw-watcher-window_' + this.queryOptions.hostname,
          bid_afk: 'aw-watcher-afk_' + this.queryOptions.hostname,
          filter_afk: this.queryOptions.filter_afk,
          categories: this.categoryStore.queryRules,
          filter_categories: [this.category],
        }) + 'RETURN = limit_events(sort_by_duration(events), 1000);';
      const data = await awclient.query(
        [
          {
            start: new Date(this.queryOptions.start),
            end: new Date(this.queryOptions.stop),
          },
        ],
        query.split('\n')
      );

      const events = data[0];
      const words = new Map<string, { word: string; duration: number; events: any[] }>();
      for (const event of events) {
        const words_in_event = event.data.title.split(/[\s\-,:()[\]/]/);
        for (const word of words_in_event) {
          if (word.length <= 2 || this.ignored_words.includes(word)) {
            continue;
          }
          if (words.has(word)) {
            words.get(word).duration += event.duration;
            words.get(word).events.push(event);
          } else {
            words.set(word, {
              word: word,
              duration: event.duration,
              events: [event],
            });
          }
        }
      }
      this.words = words;
      this.loading = false;
    },
    showEvents(word) {
      // If already showing events, hide them and return
      if (this.showing_events[0] == word) {
        this.showing_events = [];
        return;
      }
      // TODO: Group events by data
      const grouped_events = {};
      for (const event of word.events) {
        const key = JSON.stringify(event.data);
        if (key in grouped_events) {
          grouped_events[key].push(event);
        } else {
          grouped_events[key] = [event];
        }
      }

      // Construct a new array of events with the grouped events
      const events = [];
      for (const key in grouped_events) {
        const events_group = grouped_events[key];
        const new_event = {
          ...events_group[0],
          duration: 0,
        };
        for (const event of events_group) {
          new_event.duration += event.duration;
        }
        events.push(new_event);
      }

      this.showing_events = [word, events];
    },
    ignoreWord(word: string) {
      console.log('Ignoring word: ' + word);
      this.ignored_words.push(word);
    },
    createRule(word: string) {
      console.log('Opening modal for creating rule with word: ' + word);
      this.categoryStore.addClass({
        name: [word],
        rule: { type: 'regex', regex: _.escapeRegExp(word) },
      });

      // Find the category with the max ID, and open an editor for it
      const lastId = _.max(_.map(this.categoryStore.classes, 'id'));
      this.create.word = word;
      this.create.categoryId = lastId;
    },
    async createRuleOk() {
      console.log('Creating rule with word: ' + this.create.word);
      await this.categoryStore.save();
      this.fetchWords();
    },
    async createRuleCancel() {
      console.log('Cancelling create rule');
      this.create.categoryId = null;
      this.categoryStore.load(); // Restore categories to last saved
    },
    appendRule(word) {
      console.log('Opening modal to append rule with word: ' + word);
      this.append.word = _.escapeRegExp(word);
      this.isAppendRuleOpen = true;
    },
    async appendRuleOk() {
      console.log('Appending rule with word: ' + this.append.word);
      const cat = this.categoryStore.get_category(this.append.category);
      this.categoryStore.appendClassRule(cat.id, this.append.word);
      await this.categoryStore.save();
      this.fetchWords();
    },
    closeAppendRule() {
      this.isAppendRuleOpen = false;
    },
    onAppendRuleOpenChange(open) {
      this.isAppendRuleOpen = open;
    },
    handleSubmit() {
      // Exit when the form isn't valid
      if (!this.valid) {
        return;
      }
      this.closeAppendRule();
      this.appendRuleOk();
    },
  },
};
</script>
