<template>
<div class="space-y-4">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="space-y-1">
      <h5 class="text-foreground-strong text-lg font-semibold">Categorization</h5>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <ui-link class="aw-btn aw-btn-sm aw-btn-primary" :to="{ path: '/settings/category-builder' }">
        <icon name="tag"></icon>Open Category Builder
      </ui-link>
      <ui-button class="aw-btn aw-btn-sm aw-btn-warning" type="button" @click="restoreDefaultClasses">
        <icon name="undo"></icon>Restore defaults
      </ui-button>
      <label class="aw-btn aw-btn-sm aw-btn-secondary cursor-pointer">Import
        <ui-input class="hidden" type="file" @change="importCategories" />
      </label>
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary" type="button" @click="exportClasses">Export</ui-button>
    </div>
  </div>
  <p class="aw-caption">Rules for categorizing events. An event can only have one category. If several categories match, the deepest one will be chosen.</p>
  <p class="aw-caption">You can use the 
    <ui-link class="aw-link" :to="{ path: '/settings/category-builder' }">Category Builder</ui-link> to quickly create categories from uncategorized activity.
    You can also find and share categorization rule presets on <ui-link href="https://forum.activitywatch.net/c/projects/category-rules">the forum</ui-link>.
    For help on how to write categorization rules, see <ui-link href="https://docs.activitywatch.net/en/latest/features/categorization.html">the documentation</ui-link>.
  </p>
  <div class="space-y-3">
    <aw-alert variant="warning" :show="classes_unsaved_changes">
      <div class="flex items-start justify-between gap-3"><span>You have unsaved changes!</span>
        <div class="flex items-center gap-2">
          <ui-button class="aw-btn aw-btn-sm aw-btn-success" type="button" @click="saveClasses">Save</ui-button>
          <ui-button class="aw-btn aw-btn-sm aw-btn-warning" type="button" @click="resetClasses">Discard</ui-button>
        </div>
      </div>
    </aw-alert>
    <div v-for="_class in classes_hierarchy" :key="_class.id">
      <CategoryEditTree :_class="_class"></CategoryEditTree>
    </div>
    <div v-if="editingId !== null">
      <CategoryEditModal :categoryId="editingId" @hidden="hideEditModal()"></CategoryEditModal>
    </div>
  </div>
  <div class="flex items-center justify-between">
    <ui-button class="aw-btn aw-btn-md aw-btn-secondary" type="button" @click="addClass">
      <icon class="mr-2" name="plus"></icon>Add category
    </ui-button>
    <ui-button class="aw-btn aw-btn-md aw-btn-success" type="button" @click="saveClasses" :disabled="!classes_unsaved_changes">Save</ui-button>
  </div>
</div>
</template>
<script lang="ts">
import { mapState, mapGetters } from 'pinia';
import CategoryEditTree from '~/features/categorization/components/CategoryEditTree.vue';
import CategoryEditModal from '~/features/categorization/components/CategoryEditModal.vue';

import { useCategoryStore } from '~/features/categorization/store/categories';

import _ from 'lodash';

const confirmationMessage = 'Your categories have unsaved changes, are you sure you want to leave?';

export default {
  name: 'CategorizationSettings',
  components: {
    CategoryEditTree,
    CategoryEditModal,
  },
  data: () => ({
    categoryStore: useCategoryStore(),
    editingId: null,
  }),
  computed: {
    ...mapState(useCategoryStore, ['classes_unsaved_changes']),
    ...mapGetters(useCategoryStore, ['classes_hierarchy']),
  },
  mounted() {
    this.categoryStore.load();

    // Warn user about unsaved changes when closing/refreshing the browser tab.
    // Route navigation guard is handled by the parent Settings.vue component
    // using beforeRouteLeave (automatically cleaned up by Vue Router).
    window.addEventListener('beforeunload', this.beforeUnload);
  },
  beforeDestroy() {
    window.removeEventListener('beforeunload', this.beforeUnload);
  },
  methods: {
    addClass: function () {
      this.categoryStore.addClass({
        name: ['New class'],
        rule: { type: 'regex', regex: 'FILL ME' },
      });

      // Find the category with the max ID, and open an editor for it
      const lastId = _.max(_.map(this.categoryStore.classes, 'id'));
      this.editingId = lastId;
    },
    saveClasses: async function () {
      await this.categoryStore.save();
    },
    resetClasses: async function () {
      await this.categoryStore.load();
    },
    restoreDefaultClasses: async function () {
      await this.categoryStore.restoreDefaultClasses();
    },
    hideEditModal: function () {
      this.editingId = null;
    },
    exportClasses: function () {
      console.log('Exporting categories...');

      const export_data = {
        categories: this.categoryStore.classes,
      };
      // Pretty-format it for easier reading
      const text = JSON.stringify(export_data, null, 2);
      const filename = 'aw-category-export.json';

      // Initiate downloading a file by creating a hidden button and clicking it
      const element = document.createElement('a');
      element.setAttribute(
        'href',
        'data:application/json;charset=utf-8,' + encodeURIComponent(text)
      );
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    },
    importCategories: async function (elem) {
      console.log('Importing categories...');

      // Get file from upload
      const file = elem.target.files[0];
      if (file.type != 'application/json') {
        console.error('Only JSON files are possible to import');
        return;
      }

      // Read and parse import text to JSON
      const text = await file.text();
      const import_obj = JSON.parse(text);

      // Set import to categories as unsaved changes
      this.categoryStore.import(import_obj.categories);
    },
    beforeUnload: function (e) {
      if (this.classes_unsaved_changes) {
        e = e || window.event;
        e.preventDefault();
        e.returnValue = confirmationMessage;
        return confirmationMessage;
      }
    },
  },
};
</script>
