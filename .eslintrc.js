module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  env: {
    node: true
  },
  extends: ['airbnb-base', 'prettier'],
  plugins: ['import', 'prettier'],
  rules: {
    'import/extensions': [
      'error',
      'always'
    ],
    'max-len': ['error', 100],
    'prettier/prettier': [
      'error',
      { singleQuote: true, trailingComma: 'all', printWidth: 100, tabWidth: 2 }
    ],
    'no-underscore-dangle': 0,
    'linebreak-style': 0
  }
};
