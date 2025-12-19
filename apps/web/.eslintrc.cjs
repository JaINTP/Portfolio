const securityPlugin = require('eslint-plugin-security');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
  },
  env: {
    browser: true,
    es2021: true,
  },
  globals: {
    process: 'readonly',
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['react', 'react-hooks', 'security'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    ...securityPlugin.configs.recommended.rules,
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'security/detect-object-injection': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^(React|actionTypes)$' }],
    'react/no-unknown-property': ['error', { ignore: ['jsx', 'cmdk-input-wrapper'] }],
  },
  overrides: [
    {
      files: ['**/*.test.{js,jsx,ts,tsx}'],
      env: {
        jest: true,
      },
    },
  ],
};
