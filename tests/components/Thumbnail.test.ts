import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Thumbnail from '../../src/components/Thumbnail.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';
import { ui } from '../../src/lib/stores/ui.svelte';

// Mock renderThumbnail so we can control its async timing
const renderThumbnailMock = vi.fn();
vi.mock('../../src/lib/pdf/thumbnail', () => ({
  renderThumbnail: (page: any, canvas: any) => renderThumbnailMock(page, canvas),
  THUMBNAIL_WIDTH_PX: 150
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
    ui.setActiveThemeId('Nord/Polar Night');

    // Wait well past the slow render's completion time for both to settle
    await new Promise((resolve) => setTimeout(resolve, 150));

    // The host should contain a canvas from the SECOND render (Nord theme),
    // not the first (Firefox). The first render's canvas should have been
    // discarded via the render-token check.
    const canvas = container.querySelector<HTMLCanvasElement>('.canvas-host canvas');
    expect(canvas).toBeTruthy();
    expect(canvas!.dataset.themeAtStart).toBe('Nord/Polar Night');
  });
});
