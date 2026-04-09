import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { LoadingState } from '../../types';

class PdfStore {
  // $state.raw so the PDFDocumentProxy isn't wrapped in a reactivity Proxy —
  // we treat the doc as an opaque handle and only ever swap the whole reference,
  // never mutate its internals. This also preserves object identity for `toBe`.
  doc = $state.raw<PDFDocumentProxy | null>(null);
  numPages = $derived(this.doc?.numPages ?? 0);
  currentPage = $state(1);
  filename = $state('');
  loadingState = $state<LoadingState>('idle');
  errorMessage = $state('');
  isLoading = $derived(
    this.loadingState === 'reading-file' || this.loadingState === 'parsing'
  );

  setLoading(state: Exclude<LoadingState, 'ready' | 'error'>): void {
    this.loadingState = state;
    this.errorMessage = '';
  }

  /**
   * Set the filename early (before setDocument), so the EmptyState loading UI
   * can echo the file the user just dropped while parsing is still in flight.
   */
  setFilename(name: string): void {
    this.filename = name;
  }

  /** Destroy a PDFDocumentProxy, swallowing the cancellation errors that
   *  pdf.js throws when in-flight renders get torn down. */
  private safeDestroy(doc: PDFDocumentProxy): void {
    const result = doc.destroy?.();
    if (result && typeof result.catch === 'function') {
      result.catch(() => { /* ignore cancellation / teardown errors */ });
    }
  }

  setDocument(doc: PDFDocumentProxy, filename: string): void {
    if (this.doc !== null && this.doc !== doc) {
      this.safeDestroy(this.doc);
    }
    this.doc = doc;
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
    if (this.doc !== null) {
      this.safeDestroy(this.doc);
    }
    this.doc = null;
    this.currentPage = 1;
    this.filename = '';
    this.loadingState = 'idle';
    this.errorMessage = '';
  }
}

export const pdf = new PdfStore();
