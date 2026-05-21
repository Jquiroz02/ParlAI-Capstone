// ESLint 9 Flat Config — React + Vitest + JSX + Browser Globals

import js from '@eslint/js';
import react from 'eslint-plugin-react';
import vitest from 'eslint-plugin-vitest';
import babelParser from '@babel/eslint-parser';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'build/**'],
  },

  // Base JS rules
  js.configs.recommended,

  // React + JSX
  {
    files: ['**/*.jsx', '**/*.js'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-react'],
        },
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
      },
    },
    plugins: { react },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,

      // Disable outdated React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Disable annoying JSX text rule
      'react/no-unescaped-entities': 'off',

      // Disable Vite-specific rule
      'react-refresh/only-export-components': 'off',
    },
  },

  // Vitest globals
  {
    files: [
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.integration.test.jsx',
    ],
    languageOptions: {
      globals: {
        test: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    plugins: { vitest },
    rules: {},
  },
];
