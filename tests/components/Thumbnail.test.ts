import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Thumbnail from '../../src/components/Thumbnail.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';
import { ui } from '../../src/lib/stores/ui.svelte';

// Mock renderThumbnail so we can control its async timing
const renderThumbnailMock = vi.fn();
vi.mock('../../src/lib/pdf/thumbnail', () => ({
  renderThumbnail: (page: any, canvas: any, _themeId: any) => renderThumbnailMock(page, canvas)
}));

// Track which theme was "in effect" when each render started, via a tag on the canvas
function makeSlowRender(delayMs: number, getCurrentTheme: () => string) {
  return async (_page: any, canvas: HTMLCanvasElement) => {
    // Capture the theme at the moment this render started
    canvas.dataset.themeAtStart = getCurrentTheme();
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    canvas.dataset.themeAtEnd = getCurrentTheme();
  };
}

beforeEach(() => {
  pdf.reset();
  ui.reset();
  renderThumbnailMock.mockReset();
  // Give the thumbnail a fake doc so render() has something to call
  pdf.setDocument(
    {
      numPages: 5,
      getPage: vi.fn().mockResolvedValue({ pageNumber: 1 })
    } as any,
    'test.pdf'
  );
  // Mock IntersectionObserver so onMount's observer always reports intersecting
  class MockIO {
    constructor(public cb: IntersectionObserverCallback) {
      setTimeout(() => {
        cb(
          [
            { isIntersecting: true } as IntersectionObserverEntry
          ],
          this as unknown as IntersectionObserver
        );
      }, 0);
    }
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];
  }
  globalThis.IntersectionObserver = MockIO as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Thumbnail', () => {
  it('mounts with an empty canvas-host (pure JS-managed, no Svelte children)', () => {
    renderThumbnailMock.mockImplementation(async () => {
      // Don't complete — we just want to inspect initial DOM
    });
    const { container } = render(Thumbnail, { props: { pageNumber: 1 } });
    const host = container.querySelector('.canvas-host');
    expect(host).toBeTruthy();
    // No <canvas> inside yet, no Svelte-managed placeholder div either
    expect(host!.children.length).toBe(0);
  });

  it('applies the final theme when theme changes mid-render (race protection)', async () => {
    // Slow render that lets us change the theme while it's in flight
    renderThumbnailMock.mockImplementation(
      makeSlowRender(50, () => ui.activeThemeId)
    );

    ui.setActiveThemeId('Firefox/Dark');
    const { container } = render(Thumbnail, { props: { pageNumber: 1 } });

    // Wait for IntersectionObserver to fire and render() to start
    await new Promise((resolve) => setTimeout(resolve, 5));

    // Switch theme mid-render — the in-flight render should be invalidated
    // AND a replacement render dispatched, even though renderedCanvas is
    // still null at this moment. This is the exact case Codex flagged.
    ui.setActiveThemeId('Nord/Polar Night');

    // Wait well past the slow render's completion time for both to settle
    await new Promise((resolve) => setTimeout(resolve, 150));

    // The committed canvas's themeAtStart should be the NEW theme, meaning
    // a second render was dispatched by the theme change effect and that
    // replacement render is the one that won.
    const canvas = container.querySelector<HTMLCanvasElement>('.canvas-host canvas');
    expect(canvas).toBeTruthy();
    expect(canvas!.dataset.themeAtStart).toBe('Nord/Polar Night');
  });

  it('theme-change effect does not create an infinite render loop', async () => {
    // If the theme effect reactively tracks renderedCanvas, committing a
    // canvas re-fires the effect, which calls render() again, which commits
    // another canvas, and so on. A bounded test should see at most 2 mock
    // calls for this scenario: the initial IntersectionObserver-triggered
    // render, and the one dispatched by the theme change effect.
    renderThumbnailMock.mockImplementation(
      makeSlowRender(20, () => ui.activeThemeId)
    );

    ui.setActiveThemeId('Firefox/Dark');
    render(Thumbnail, { props: { pageNumber: 1 } });

    await new Promise((resolve) => setTimeout(resolve, 5));
    ui.setActiveThemeId('Nord/Polar Night');
    // Wait long enough for several potential loop iterations to occur
    await new Promise((resolve) => setTimeout(resolve, 300));

    // With the fix: exactly 2 calls (initial + theme-change).
    // Without the fix: many more (infinite loop bounded by the wait window).
    expect(renderThumbnailMock.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
