import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// eslint-config-next v16 ships native flat configs, so we extend them directly
// rather than going through @eslint/eslintrc's FlatCompat (which chokes on the
// new self-referential plugin objects with "Converting circular structure").
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react/no-unescaped-entities': 'off',
    },
  },
];

export default eslintConfig;
