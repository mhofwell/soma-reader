import '@testing-library/svelte/vitest';
// happy-dom does not implement <canvas>.getContext('2d') in a way that PDF.js
// or doq can call against. vitest-canvas-mock provides a stub that returns a
// non-null context with no-op methods, which is what we need for unit tests
// that verify our code calls the right APIs (we never assert pixel output).
import 'vitest-canvas-mock';
