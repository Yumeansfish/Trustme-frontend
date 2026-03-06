<template lang="pug">
div
  div.aw-summary-container
</template>

<style scoped lang="scss">
.aw-summary-container {
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;

  /* Custom scrollbar — Indigo theme */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #c5c4e8;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #9897f3;
  }
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: #c5c4e8 transparent;
}
</style>

<style lang="scss">
.aw-summary-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}

.aw-summary-empty {
  color: #aaa;
  font-size: 0.9rem;
  padding: 8px 0;
  text-align: center;
}

/* Rize-style compact horizontal row */
.aw-row {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 10px 4px;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid #f3f3f8;
  transition: background-color 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #fafaff;
    text-decoration: none;
    color: inherit;
  }
}

/* 1. Percentage */
.aw-row-pct {
  width: 42px;
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6c7a89;
  text-align: right;
  margin-right: 12px;
}

/* 2. Mini progress bar */
.aw-row-bar-wrap {
  width: 80px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 5px;
  overflow: hidden;
  margin-right: 14px;
}

.aw-row-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s ease;
}

/* 3. Name */
.aw-row-name {
  flex: 1;
  font-size: 0.92rem;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* 4. Duration */
.aw-row-duration {
  flex-shrink: 0;
  font-size: 0.85rem;
  color: #95a5a6;
  white-space: nowrap;
  margin-left: 12px;
  min-width: 55px;
  text-align: right;
}

/* 5. Edit icon */
.aw-row-edit {
  flex-shrink: 0;
  margin-left: 10px;
  color: #c0c4cc;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.15s ease;

  &:hover {
    color: #5e5ce6;
  }

  svg {
    display: block;
  }
}
</style>

<script lang="ts">
// NOTE: This is just a Vue.js component wrapper for summary.ts
//       Code should generally go in the framework-independent file.

import summary from './summary';

export default {
  name: 'aw-summary',
  props: {
    fields: Array,
    namefunc: Function,
    hoverfunc: {
      type: Function,
      default: null,
    },
    colorfunc: Function,
    linkfunc: {
      type: Function,
      default: () => null,
    },
    with_limit: {
      type: Boolean,
      default: false,
    },
  },
  data: function () {
    return {};
  },
  computed: {},
  watch: {
    fields: function () {
      this.update();
    },
  },
  mounted: function () {
    const el = this.$el.children[0];
    summary.create(el);
    this.update();
  },
  methods: {
    update: function () {
      const el = this.$el.children[0];
      if (this.fields) {
        summary.updateSummedEvents(
          el,
          this.fields,
          this.namefunc,
          this.hoverfunc,
          this.colorfunc,
          this.linkfunc
        );
      } else {
        summary.set_status(el, 'Loading...');
      }
    },
  },
};
</script>
