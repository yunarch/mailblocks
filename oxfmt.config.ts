import { config } from '@yunarch/config-web/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...config,
  ignorePatterns: ['src/utils/templates.ts'],
  sortTailwindcss: true,
});
