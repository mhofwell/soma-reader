import type { PDFPageProxy } from 'pdfjs-dist';

export interface RenderOptions {
  /** PDF.js scale (1.0 = native PDF coordinates ≈ 72 DPI) */
  scale: number;
  /** Device pixel ratio. Use window.devicePixelRatio in app code. */
  dpr: number;
  /** Optional cache id used by doq's per-canvas color cache */
  cacheId?: string;
}

/**
 * Render a single PDF page to a canvas. Sets up high-DPI rendering by
 * making the canvas internally `viewport × dpr` pixels and CSS-displaying
 * at `viewport` size, with PDF.js's transform parameter handling the scale.
 *
 * The actual dark mode transformation is applied automatically by doq if
 * doq.enable() / doq.setTheme() has been called — this function does NOT
 * touch doq itself.
 */
export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  opts: RenderOptions
): Promise<void> {
  const viewport = page.getViewport({ scale: opts.scale });

  canvas.width = Math.floor(viewport.width * opts.dpr);
  canvas.height = Math.floor(viewport.height * opts.dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  if (opts.cacheId) {
    canvas.dataset.cacheId = opts.cacheId;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D rendering context');
  }

  // PDF.js's render parameter type uses `transform?: number[]` (optional, not
  // nullable). When dpr=1, omit the field entirely via conditional spread —
  // passing `null` would be a TypeScript error.
  await page.render({
    canvasContext: ctx,
    viewport,
    ...(opts.dpr !== 1 && {
      transform: [opts.dpr, 0, 0, opts.dpr, 0, 0] as [number, number, number, number, number, number]
    })
  } as Parameters<PDFPageProxy['render']>[0]).promise;
}
