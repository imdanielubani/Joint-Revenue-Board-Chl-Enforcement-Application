import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  // Production serves dist/ only; no source maps, so the browser never gets the original src/ files.
  build: { sourcemap: false },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    restoreMocks: true,
    // Whole-app tests load pages on first use; on a busy machine that can pass the 5s default.
    testTimeout: 15_000,
    // expect.poll waits as long as findBy* does (src/test/setup.ts), not its own 1s default.
    expect: { poll: { timeout: 10_000 } },
  },
})
