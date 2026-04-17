// ESLint flat config.
//
// Previous version used FlatCompat to extend next/core-web-vitals +
// next/typescript. That crashes under Next 16 + ESLint 8.57 with
// "Converting circular structure to JSON" because the legacy configs
// both pull eslint-plugin-react through different paths and
// FlatCompat tries to deep-stringify the resulting shared object.
//
// Fix: use the plugins directly in flat config — they ship native
// flat-config exports so FlatCompat isn't needed.

import nextPlugin from '@next/eslint-plugin-next';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'dist-api/**', 'out/**'],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooksPlugin,
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // TS basics — match the old next/typescript baseline without
      // type-aware rules so lint runs stay fast.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
