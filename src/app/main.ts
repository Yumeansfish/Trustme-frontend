import { createApp } from 'vue';

import '../shared/styles/tailwind.css';

import router from './router';
import pinia from './pinia';
import { createClient, configureClient } from './lib/awclient';
import { preloadInitialActivityRoute } from '~/app/setup/activityPreload';
import { registerGlobalComponents } from '~/app/setup/globalComponents';
createClient();

import App from './App.vue';

const app = createApp(App);

registerGlobalComponents(app);

app.use(router);
app.use(pinia);

app.mount('#app');

void router.isReady().then(() => {
  void preloadInitialActivityRoute(router.currentRoute.value);
});

configureClient();
