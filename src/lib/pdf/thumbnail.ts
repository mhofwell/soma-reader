import type { PDFPageProxy } from 'pdfjs-dist';
import { renderPageToCanvas } from './renderer';

const THUMBNAIL_WIDTH_PX = 240; // CSS pixels

/**
 * Renders a low-res thumbnail of a PDF page to a canvas.
 * Width is fixed at THUMBNAIL_WIDTH_PX; height is computed from the page aspect ratio.
 * `themeId` is included in the cache key so doq's per-canvas color cache
 * is invalidated on theme change (without it, switching themes could show
 * stale-colored thumbnails from a previous theme).
 */
export async function renderThumbnail(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  themeId: string
): Promise<void> {
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = THUMBNAIL_WIDTH_PX / baseViewport.width;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  await renderPageToCanvas(page, canvas, {
    scale,
    dpr,
    cacheId: `thumb-${page.pageNumber}-${themeId}-${scale}-${dpr}`
  });
}
