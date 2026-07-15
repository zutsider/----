import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    restoreMocks: true
  }
});

