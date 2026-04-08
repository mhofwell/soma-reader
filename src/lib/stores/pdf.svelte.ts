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
    this.doc = null;
    this.numPages = 0;
    this.currentPage = 1;
    this.filename = '';
    this.loadingState = 'idle';
    this.errorMessage = '';
  }
}

export const pdf = new PdfStore();
