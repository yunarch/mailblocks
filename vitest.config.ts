import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: './.vitest/coverage',
      reporter: [
        'text-summary',
        'html',
        ['json-summary', { file: 'coverage.json' }],
      ],
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: [
        '**/node_modules/**',
        '**/*.d.ts',
        'src/__tests__/**',
        'src/**/__tests__/**',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/utils/templates.ts',
      ],
    },
    attachmentsDir: './.vitest/attachments',
    outputFile: {
      blob: './.vitest/reports/blob.json',
    },
    isolate: false,
    projects: [
      {
        extends: true,
        test: {
          name: {
            label: 'standard',
            color: 'cyan',
          },
          exclude: [
            '**/node_modules/**',
            '**/__e2e__/**',
            '**/*.browser.{test,spec}.{js,jsx,ts,tsx}',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: {
            label: 'browser',
            color: 'green',
          },
          include: ['**/*.browser.{test,spec}.{js,jsx,ts,tsx}'],
          exclude: ['**/node_modules/**', '**/__e2e__/**'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              { browser: 'chromium', viewport: { width: 810, height: 1080 } },
            ],
            screenshotDirectory: './.vitest/screenshots',
          },
          setupFiles: ['./src/__tests__/setup.browser.ts'],
        },
      },
    ],
  },
});
