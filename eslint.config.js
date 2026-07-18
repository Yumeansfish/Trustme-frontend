import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import accessibility from 'eslint-plugin-vuejs-accessibility';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'src/shared/contracts/*.generated.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  ...accessibility.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,vue}', 'test/**/*.ts', 'scripts/**/*.{ts,mjs}', 'vite.config.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        __TRUSTME_APP_CONFIG__: 'readonly',
        __TRUSTME_DEV_SERVER__: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'error',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/shared/ui/{Checkbox,Select,Textarea}.vue'],
    rules: {
      'vuejs-accessibility/form-control-has-label': 'off',
    },
  },
  {
    files: ['src/shared/ui/{AppDialog,AppModal}.vue'],
    rules: {
      'vuejs-accessibility/click-events-have-key-events': 'off',
      'vuejs-accessibility/no-static-element-interactions': 'off',
    },
  },
  {
    files: ['src/features/timeline/components/TimelineLaneCard.vue'],
    rules: {
      // Timeline segments are focusable graphics with paired mouse and focus behavior.
      'vuejs-accessibility/no-static-element-interactions': 'off',
    },
  }
);
