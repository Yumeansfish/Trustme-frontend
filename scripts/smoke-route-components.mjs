import path from 'node:path';
import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routeComponents = {
  Activity: 'src/features/activity/views/Activity.vue',
  Home: 'src/features/home/views/Home.vue',
  Review: 'src/features/review/views/Review.vue',
  Settings: 'src/features/settings/views/Settings.vue',
  Timeline: 'src/features/timeline/views/Timeline.vue',
};

await build({
  configFile: false,
  root,
  publicDir: path.resolve(root, 'static'),
  logLevel: 'error',
  plugins: [vue()],
  resolve: {
    alias: {
      '~': path.resolve(root, 'src'),
    },
  },
  define: {
    __TRUSTME_APP_CONFIG__: '{}',
  },
  build: {
    ssr: true,
    write: false,
    rollupOptions: {
      input: Object.values(routeComponents),
    },
  },
});

for (const name of Object.keys(routeComponents)) {
  process.stdout.write(`${name}: ok\n`);
}
