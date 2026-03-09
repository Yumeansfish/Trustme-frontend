<template>
<div class="aw-card-muted space-y-3" v-if="show">
  <aw-alert v-if="note" variant="warning" show>
    <div class="flex items-start justify-between gap-3"><span>This will not appear in the production build <span v-if="reason">({{ reason }})</span>.</span>
      <ui-button class="aw-btn aw-btn-sm aw-btn-secondary shrink-0" type="button" @click="hide = true">Hide</ui-button>
    </div>
  </aw-alert>
  <slot></slot>
</div>
</template>

<script lang="ts">
export default {
  props: {
    note: {
      type: Boolean,
      default: true,
    },
    reason: {
      type: String,
      default: null,
    },
  },
  data: () => {
    return { hide: false };
  },
  computed: {
    show() {
      return !PRODUCTION && !this.hide;
    },
  },
};
</script>
