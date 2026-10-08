const js = require('@eslint/js');
const globals = require('globals');

const commonRules = {
  'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  'no-undef': 'error',
  'require-atomic-updates': 'error',
  'no-implicit-globals': 'error',
  'no-restricted-properties': [
    'warn',
    { property: 'innerHTML', message: 'innerHTML use flagged for review (XSS risk) — warning only, not blocking.' },
  ],
};

module.exports = [
  {
    // src/** is not linted yet — a later slice of #180 adds TS-aware linting of
    // the card sources. The generated glp-card.js now inlines the Lit runtime,
    // whose minified third-party code cannot be meaningfully linted, so it is
    // ignored as well; the innerHTML assignment gate lives in CI
    // (`grep -nE "(inner|outer)HTML\s*=" src/*.ts`).
    ignores: ['node_modules/**', 'docs/**', 'graphify-out/**', 'src/**', 'glp-card.js'],
  },
  js.configs.recommended,
  {
    files: ['eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['scripts/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
    rules: commonRules,
  },
  {
    files: ['test/**/*.js', 'test/**/*.mjs', 'test/helpers/**/*.cjs'],
    languageOptions: {
      globals: globals.node,
    },
    rules: commonRules,
  },
];
