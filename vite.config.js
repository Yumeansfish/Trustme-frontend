import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const PRODUCTION = mode === 'production';
  const CSP = PRODUCTION ? '' : "*:5600 *:5666 ws://*:27180 'unsafe-inline' 'unsafe-eval'";

  // Sets the CSP
  const setCsp = () => {
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
        const cspContent = `default-src 'self' ${CSP} https://api.github.com/repos/ActivityWatch/activitywatch/releases/latest; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; script-src 'self' 'unsafe-eval'`;
        return html.replace(
          placeholder,
          `<!-- Verify with https://csp-evaluator.withgoogle.com/ -->\n    <meta http-equiv="Content-Security-Policy" content="${cspContent}">`
        );
      },
    };
  };

  // Auto-injects /src/main.js into index.html on a new line after the one which has VITE_AUTOINJECT
  const autoInject = () => {
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
            '<!-- Vite injected! --><script type="module" src="/src/main.js"></script>'
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
      VitePWA({
        devOptions: {
          enabled: false,
        },
        manifest: {
          name: 'ActivityWatch',
          short_name: 'ActivityWatch',
          description: 'Automatically track your computer usage',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'logo.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
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
      PRODUCTION,
      AW_SERVER_URL: JSON.stringify(process.env.AW_SERVER_URL || ''),
      COMMIT_HASH: process.env.COMMIT_HASH,
      'process.env.VUE_APP_ON_ANDROID': process.env.VUE_APP_ON_ANDROID,
    },
  };
});
