import type { PDFPageProxy } from 'pdfjs-dist';
import { renderPageToCanvas } from './renderer';

const THUMBNAIL_WIDTH_PX = 150; // CSS pixels

/**
 * Renders a low-res thumbnail of a PDF page to a canvas.
 * Width is fixed at THUMBNAIL_WIDTH_PX; height is computed from the page aspect ratio.
 */
export async function renderThumbnail(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement
): Promise<void> {
  // Get a viewport at scale 1 just to compute aspect ratio
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = THUMBNAIL_WIDTH_PX / baseViewport.width;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  await renderPageToCanvas(page, canvas, {
    scale,
    dpr,
    cacheId: `thumb-${page.pageNumber}-${Date.now()}`
  });
}

export { THUMBNAIL_WIDTH_PX };
