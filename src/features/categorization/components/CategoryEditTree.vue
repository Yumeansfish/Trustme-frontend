<template>
<div class="space-y-2">
  <div class="aw-tree-row">
    <div class="min-w-0 flex-1">
      <button class="text-foreground flex items-start gap-2 text-left" type="button" :class="indentClass(depth)" @click="toggleExpanded"><span class="text-foreground-muted pt-0.5">
          <icon v-if="_class.children.length > 0" :name="expanded ? 'regular/minus-square' : 'regular/plus-square'" scale="0.8"></icon>
          <icon v-else name="circle" scale="0.4"></icon></span><span class="min-w-0"><span class="aw-tree-name">{{ _class.name.slice(depth).join(" ➤ ")}}</span>
          <input class="ml-1 h-4 w-4 pointer-events-none cursor-default rounded-full border-0 bg-transparent p-0" v-if="_class.data && _class.data.color" type="color" :value="_class.data.color" tabindex="-1" aria-label="Category color"><span class="aw-tree-meta ml-1" v-if="_class.children.length > 0">({{totalChildren}})</span><span class="hidden text-xs md:inline" v-if="_class.data && _class.data.score !== undefined" :class="_class.data.score > 0 ? 'text-success' : 'text-danger'">&nbsp; {{ _class.data.score >= 0 ? '+' : '' }}{{ _class.data.score }}</span><span class="aw-tree-rule hidden md:block"><span v-if="_class.rule.type === 'regex'">Rule ({{_class.rule.type}}): <code class="aw-code-inline">{{_class.rule.regex}}</code></span><span v-else>No rule</span></span></span></button>
    </div>
    <div class="flex items-center gap-2">
      <button class="aw-btn aw-btn-sm aw-btn-secondary" type="button" @click="showEditModal(_class.id)">
        <icon name="edit"></icon>
      </button>
      <button class="aw-btn aw-btn-sm aw-btn-success" type="button" @click="addSubclass(_class); expanded = true">
        <icon name="plus"></icon>
      </button>
    </div>
  </div>
  <div class="space-y-2" v-if="expanded">
    <div v-for="child in _class.children">
      <CategoryEditTree :_class="child" :depth="depth+1"></CategoryEditTree>
    </div>
  </div>
  <div v-if="editingId !== null">
    <CategoryEditModal :categoryId="editingId" @hidden="hideEditModal()"></CategoryEditModal>
  </div>
</div>
</template>

<script lang="ts">

import CategoryEditModal from './CategoryEditModal.vue';
import { useCategoryStore } from '~/features/categorization/store/categories';

import _ from 'lodash';

export default {
  name: 'CategoryEditTree',
  components: {
    CategoryEditModal,
  },
  props: {
    _class: Object,
    depth: {
      type: Number,
      default: 0,
    },
  },
  data: function () {
    return {
      categoryStore: useCategoryStore(),

      expanded: this.depth < 1,
      editingId: null,
    };
  },
  computed: {
    totalChildren: function () {
      function countChildren(node) {
        return node.children.length + _.sum(_.map(node.children, countChildren));
      }
      return countChildren(this._class);
    },
  },
  methods: {
    indentClass(depth) {
      const classes = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20', 'pl-24'];
      return classes[Math.min(depth, classes.length - 1)];
    },
    toggleExpanded() {
      if (this._class.children.length > 0) {
        this.expanded = !this.expanded;
      }
    },
    addSubclass: function (parent) {
      // Generate a unique default name to prevent duplicate name conflicts (#702)
      const baseName = 'New class';
      let name = baseName;
      let counter = 2;
      const existingNames = this.categoryStore.classes.map(c => JSON.stringify(c.name));
      while (existingNames.includes(JSON.stringify(parent.name.concat([name])))) {
        name = `${baseName} (${counter})`;
        counter++;
      }

      this.categoryStore.addClass({
        name: parent.name.concat([name]),
        rule: { type: 'regex', regex: 'FILL ME' },
      });

      // Find the category with the max ID, and open an editor for it
      const lastId = _.max(_.map(this.categoryStore.classes, 'id'));
      this.editingId = lastId;
    },
    showEditModal: function () {
      this.editingId = this._class.id;
    },
    hideEditModal: function () {
      this.editingId = null;
    },
  },
};
</script>
