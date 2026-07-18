<template>
<div class="h-full min-h-0">
  <aw-alert
    v-for="error in errors"
    :key="error.id"
    variant="danger"
    show
    dismissible
    @dismissed="dismissError(error.id)"
  >
    {{ error.message }}
  </aw-alert>
  <slot></slot>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

interface CapturedError {
  id: number;
  message: string;
}

// Based on: https://medium.com/@dillonchanis/handling-errors-in-vue-with-error-boundaries-91f6ead0093b
export default defineComponent({
  name: 'ErrorBoundary',
  data() {
    return {
      errors: [] as CapturedError[],
      nextErrorId: 1,
    };
  },
  errorCaptured(err: unknown, _vm: unknown, _info: string) {
    console.error("Error captured!", err, _vm, _info);

    const candidate = err as {
      code?: string;
      response?: { data?: { message?: unknown } };
      name?: string;
      message?: string;
    };

    // Ignore request cancellation errors
    if (candidate?.code === 'ERR_CANCELED') {
      return false;
    }

    // fallback
    let message = String(err);
    // use server error response if available; err.isAxiosError doesn't help much here…
    if (typeof candidate?.response?.data?.message === 'string') {
      message = candidate.response.data.message;
    } else if (candidate?.name && candidate.message) {
      message = `${candidate.name}: ${candidate.message}.
					See dev console (F12) and/or server logs for more info.`;
    }

    this.errors.push({
      id: this.nextErrorId++,
      message,
    });
    return false;
  },
  methods: {
    dismissError(id: number) {
      this.errors = this.errors.filter(error => error.id !== id);
    },
  },
});
</script>
