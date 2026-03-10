<template>
  <div class="h-full min-h-0">
    <iframe class="h-full w-full" :src="src" frameborder="0"></iframe>
  </div>
</template>

<script lang="js">
import moment from 'moment';
import { useActivityStore } from '~/features/activity/store/activity';

export default {
  name: 'aw-custom-watcher',
  props: {
    visname: String,
    title: String,
  },
  computed: {
    src: function () {
      const options = useActivityStore().query_options;
      if (!options || !options.timeperiod) return '';
      const start = options.timeperiod.start;
      const end = moment(start).add(...options.timeperiod.length).toISOString();
      const urlParams = new URLSearchParams({
        hostname: options.host,
        start,
        end,
        title: this.title,
      });
      let _origin = document.location.origin;
      if(document.location.port == "27180") {
        // NOTE: document.location.origin won't work when running aw-webui in dev mode
        _origin = "http://localhost:5666"
      }
      return _origin + '/pages/' + this.visname + '/?' + urlParams.toString();
    },
  },
};
</script>
