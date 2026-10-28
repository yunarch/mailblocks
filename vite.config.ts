import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react(), tailwindcss()],
  base: '/mailblocks/',
  server: {
    port: 3000,
  },
});
