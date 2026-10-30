import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // Uses the existing public/manifest.json.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // The bundled templates make the main chunk over 5 MB, above Workbox's 2 MiB default.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  base: '/mailblocks/',
  server: {
    port: 3000,
  },
});
