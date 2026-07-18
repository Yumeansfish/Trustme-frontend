import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { notificationPreviewPlugin } from './scripts/notificationPreviewPlugin';

function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  if (id.includes('/chart.js/') || id.includes('/vue-chartjs/')) {
    return 'vendor-charts';
  }

  if (id.includes('/moment/')) {
    return 'vendor-time';
  }

  if (id.includes('/vue/') || id.includes('/vue-router/') || id.includes('/pinia/')) {
    return 'vendor-vue';
  }

  return undefined;
}

export default defineConfig(({ mode, command, isPreview }) => {
  const PRODUCTION = mode === 'production';
  const DEV_SERVER = command === 'serve' && !isPreview;
  const appConfig = {
    production: PRODUCTION,
    awServerUrl: process.env.VITE_AW_SERVER_URL || process.env.AW_SERVER_URL || '',
  };

  // Sets the CSP during HTML transform
  const setCsp = (): Plugin => {
    return {
      name: 'html-transform',
      transformIndexHtml(html) {
        const placeholder = '<!-- CSP_PLACEHOLDER -->';
        if (!html.includes(placeholder)) {
          throw new Error(`Could not find CSP_PLACEHOLDER in the html file`);
        }
        if (!PRODUCTION) {
          return html.replace(placeholder, '');
        }
        const cspContent = [
          "default-src 'self'",
          "connect-src 'self' https://api.github.com",
          "img-src 'self' data:",
          "font-src 'self' data:",
          "style-src 'self' 'unsafe-inline'",
          "object-src 'none'",
          "script-src 'self'",
        ].join('; ');
        return html.replace(
          placeholder,
          `<!-- Verify with https://csp-evaluator.withgoogle.com/ -->\n    <meta http-equiv="Content-Security-Policy" content="${cspContent}">`
        );
      },
    };
  };

  // Auto-injects /src/main.ts into index.html on a new line after the one which has VITE_AUTOINJECT
  const autoInject = (): Plugin => {
    return {
      name: 'html-transform',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          const pattern = /<!--.*VITE_AUTOINJECT.*-->/;
          // check if the pattern exists in the html, if not, throw error
          if (!pattern.test(html)) {
            throw new Error(`Could not find pattern ${pattern} in the html file`);
          }
          return html.replace(
            pattern,
            '<!-- Vite injected! --><script type="module" src="/src/main.ts"></script>'
          );
        },
      },
    };
  };

  // Return the configuration
  return {
    plugins: [
      setCsp(),
      autoInject(),
      vue(),
      tailwindcss(),
      ...(DEV_SERVER ? [notificationPreviewPlugin(path.resolve(__dirname, '..'))] : []),
    ],
    server: {
      port: 27180,
      proxy: {
        '/api': 'http://127.0.0.1:5600',
      },
      // TODO: Fix this.
      // Breaks a bunch of style-related stuff etc.
      // We'd need to move in the entire CSP config in here (not just the default-src) if we want to use this.
      //headers: {
      //  'Content-Security-Policy': PRODUCTION ? "default-src 'self'" : "default-src 'self' *:5666",
      //},
    },
    publicDir: './static',
    resolve: {
      alias: { '~': path.resolve(__dirname, 'src') },
    },
    define: {
      __TRUSTME_APP_CONFIG__: JSON.stringify(appConfig),
      __TRUSTME_DEV_SERVER__: JSON.stringify(DEV_SERVER),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  };
});
