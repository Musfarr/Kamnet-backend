module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'max-len': ['warn', { 'code': 100, 'ignoreComments': true, 'ignoreUrls': true }],
    'eqeqeq': ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],
    'comma-dangle': ['error', 'never'],
  },
};
