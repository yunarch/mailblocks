import { config } from '@yunarch/config-web/eslint';

const eslintConfig: ReturnType<typeof config> = config(
  {
    ignores: ['./src/utils/templates.ts'],
    typescript: {
      tsconfigPath: './tsconfig.json',
    },
    import: true,
    unicorn: true,
    jsdoc: true,
    react: true,
    test: true,
  },
  {
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'react-refresh/only-export-components': 'off',
    },
  }
);

export default eslintConfig;
