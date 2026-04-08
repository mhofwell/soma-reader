import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $components: resolve(__dirname, 'src/components')
    },
    // Use Svelte's browser entry point rather than its SSR entry. Otherwise
    // component mount() fails with 'server_context_required' because the
    // server build of svelte/index.js throws on mount calls outside SSR.
    conditions: ['browser', 'svelte']
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.ts']
  }
});
