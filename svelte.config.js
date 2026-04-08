import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// vitePreprocess relies on Vite's internal CSS processing pipeline. That
// pipeline isn't set up the same way inside vitest's runner, so we skip it in
// tests. Tests don't actually exercise <style> content — they only verify
// component markup and behavior.
const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

export default {
  preprocess: isTest ? [] : vitePreprocess(),
  compilerOptions: {
    runes: true
  }
};
