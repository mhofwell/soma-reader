import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeViewport = { width: 612, height: 792 };
type RenderArgs = { canvasContext: unknown; viewport: unknown; transform?: number[] };
const renderPromise = vi.fn((_args: RenderArgs) => ({ promise: Promise.resolve() }));
const fakePage = {
  getViewport: vi.fn(() => fakeViewport),
  render: renderPromise
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pdf/renderer', () => {
  it('renderPageToCanvas sets canvas size and calls page.render with the right params', async () => {
    const { renderPageToCanvas } = await import('../../../src/lib/pdf/renderer');
    const canvas = document.createElement('canvas');
    await renderPageToCanvas(fakePage as any, canvas, { scale: 1.5, dpr: 2 });

    // Internal pixel size = viewport × dpr
    expect(canvas.width).toBe(612 * 2);
    expect(canvas.height).toBe(792 * 2);
    // CSS size = viewport
    expect(canvas.style.width).toBe('612px');
    expect(canvas.style.height).toBe('792px');

    // page.render called with the dpr transform
    expect(renderPromise).toHaveBeenCalledTimes(1);
    const renderArgs = renderPromise.mock.lastCall?.[0];
    expect(renderArgs).toBeDefined();
    expect(renderArgs!.viewport).toBe(fakeViewport);
    expect(renderArgs!.transform).toEqual([2, 0, 0, 2, 0, 0]);
    expect(renderArgs!.canvasContext).toBeDefined();
  });

  it('omits the transform field when dpr=1', async () => {
    const { renderPageToCanvas } = await import('../../../src/lib/pdf/renderer');
    const canvas = document.createElement('canvas');
    await renderPageToCanvas(fakePage as any, canvas, { scale: 1, dpr: 1 });
    const args = renderPromise.mock.lastCall?.[0];
    expect(args).toBeDefined();
    expect(args!.transform).toBeUndefined();
  });

  it('passes a unique cacheId to canvas dataset', async () => {
    const { renderPageToCanvas } = await import('../../../src/lib/pdf/renderer');
    const canvas = document.createElement('canvas');
    await renderPageToCanvas(fakePage as any, canvas, { scale: 1, dpr: 1, cacheId: 'page-3' });
    expect(canvas.dataset.cacheId).toBe('page-3');
  });
});
