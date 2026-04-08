import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { LoadingState } from '../../types';

class PdfStore {
  // $state.raw so the PDFDocumentProxy isn't wrapped in a reactivity Proxy —
  // we treat the doc as an opaque handle and only ever swap the whole reference,
  // never mutate its internals. This also preserves object identity for `toBe`.
  doc = $state.raw<PDFDocumentProxy | null>(null);
  numPages = $state(0);
  currentPage = $state(1);
  filename = $state('');
  loadingState = $state<LoadingState>('idle');
  errorMessage = $state('');

  setLoading(state: Exclude<LoadingState, 'ready' | 'error'>): void {
    this.loadingState = state;
    this.errorMessage = '';
  }

  setDocument(doc: PDFDocumentProxy, filename: string): void {
    // Release the previous document's worker-side resources. doc.destroy()
    // returns a Promise that can REJECT with a cancellation error if any
    // page/thumbnail renders were in flight when destroy() ran — pdf.js
    // cancels those tasks as part of teardown. Swallow the rejection so
    // it doesn't surface as an unhandledrejection in the browser/tests.
    // Optional chaining tolerates test doubles that don't implement destroy().
    if (this.doc !== null && this.doc !== doc) {
      const destroyResult = this.doc.destroy?.();
      if (destroyResult && typeof destroyResult.catch === 'function') {
        destroyResult.catch(() => {
          /* ignore cancellation and teardown errors from a destroyed proxy */
        });
      }
    }
    this.doc = doc;
    this.numPages = doc.numPages;
    this.currentPage = 1;
    this.filename = filename;
    this.loadingState = 'ready';
    this.errorMessage = '';
  }

  setError(message: string): void {
    this.loadingState = 'error';
    this.errorMessage = message;
  }

  /**
   * Clear an error state WITHOUT resetting the loaded document. Used when
   * the user dismisses a load-failure error (e.g., a failed swap attempt
   * while a working document is still open underneath) — they want to
   * dismiss the error, not destroy the document they were reading.
   *
   * If no document is loaded, resets to idle. If a document IS loaded,
   * returns to 'ready' state.
   */
  clearError(): void {
    if (this.loadingState !== 'error') return;
    this.errorMessage = '';
    this.loadingState = this.doc !== null ? 'ready' : 'idle';
  }

  goToPage(n: number): void {
    if (this.numPages === 0) return;
    this.currentPage = Math.max(1, Math.min(this.numPages, n));
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  reset(): void {
    // Release worker-side resources before dropping the reference.
    // See setDocument() above for why we attach a catch() — destroy() can
    // reject when in-flight render tasks get cancelled, and we don't want
    // that rejection leaking as an unhandledrejection.
    if (this.doc !== null) {
      const destroyResult = this.doc.destroy?.();
      if (destroyResult && typeof destroyResult.catch === 'function') {
        destroyResult.catch(() => {
          /* ignore cancellation and teardown errors from a destroyed proxy */
        });
      }
    }
    this.doc = null;
    this.numPages = 0;
    this.currentPage = 1;
    this.filename = '';
    this.loadingState = 'idle';
    this.errorMessage = '';
  }
}

export const pdf = new PdfStore();
