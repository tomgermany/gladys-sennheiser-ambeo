// -----------------------------------------------------------------------------
// ESLint flat config (ESLint 9+).
//
// Goal: catch real mistakes (undefined variables, unused code, unreachable
// branches) and nothing else. Formatting and indentation are the author's
// business: Prettier is deliberately not used in this project.
// -----------------------------------------------------------------------------

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/', 'data/'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Unused variables are a mistake; allow a leading underscore to mark an
      // argument as intentionally ignored (e.g. `(_gladys, config) => ...`).
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
