import { defineStore } from 'pinia';
import { getClient } from '~/app/lib/awclient';

interface ServerInfo {
  hostname: string;
  device_id: string;
  version: string;
  testing: boolean;
}

interface State {
  info: ServerInfo | null;
}

export const useServerStore = defineStore('server', {
  state: (): State => ({
    info: null,
  }),

  actions: {
    async getInfo() {
      try {
        const info = await getClient().getInfo();
        this.$patch({ info: info });
      } catch (e) {
        console.error('Unable to connect: ', e);
      }
    },
  },
});
