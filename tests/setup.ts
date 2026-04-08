import '@testing-library/svelte/vitest';
// happy-dom does not implement <canvas>.getContext('2d') in a way that PDF.js
// or doq can call against. vitest-canvas-mock provides a stub that returns a
// non-null context with no-op methods, which is what we need for unit tests
// that verify our code calls the right APIs (we never assert pixel output).
import 'vitest-canvas-mock';

// happy-dom does not implement the Web Animations API (element.animate).
// Svelte's built-in transitions (fly, slide, etc.) rely on it. Stub it with
// a no-op that returns a minimal Animation-like object so transitions
// no-op cleanly during tests.
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = function () {
    return {
      cancel() {},
      finish() {},
      play() {},
      pause() {},
      reverse() {},
      addEventListener() {},
      removeEventListener() {},
      finished: Promise.resolve(),
      onfinish: null,
      oncancel: null,
      playState: 'finished',
      currentTime: 0,
      startTime: 0,
      playbackRate: 1
    } as unknown as Animation;
  };
}
