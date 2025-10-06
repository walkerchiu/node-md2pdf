const { resolve } = require('path');

module.exports = [
  {
    files: ['**/*.ts', '**/*.js'], // Specify the files ESLint should target
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: resolve(__dirname, './tsconfig.json'),
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      import: require('eslint-plugin-import'),
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'import/no-unresolved': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts'],
      },
      'import/resolver': {
        node: {
          extensions: ['.js', '.ts'],
        },
        typescript: {
          alwaysTryTypes: true,
          project: resolve(__dirname, './tsconfig.json'),
        },
      },
    },
  },
];
