import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface SomaLinkServiceOptions {
  navigateToPage: (pageNum: number) => void;
  getCurrentPage: () => number;
  getPagesCount: () => number;
}

/**
 * Minimal link service adapter for pdf.js AnnotationLayer.
 *
 * Bridges annotation link clicks into the host scroll system via callbacks,
 * keeping this module decoupled from Svelte internals.
 */
export class SomaLinkService {
  readonly eventBus: undefined = undefined;
  readonly externalLinkEnabled = true;
  readonly isInPresentationMode = false;

  #navigateToPage: (pageNum: number) => void;
  #getCurrentPage: () => number;
  #getPagesCount: () => number;
  #pdfDocument: PDFDocumentProxy | null = null;

  constructor(opts: SomaLinkServiceOptions) {
    this.#navigateToPage = opts.navigateToPage;
    this.#getCurrentPage = opts.getCurrentPage;
    this.#getPagesCount = opts.getPagesCount;
  }

  get pagesCount(): number {
    return this.#getPagesCount();
  }

  get page(): number {
    return this.#getCurrentPage();
  }

  set page(value: number) {
    this.#navigateToPage(value);
  }

  setDocument(doc: PDFDocumentProxy | null): void {
    this.#pdfDocument = doc;
  }

  goToPage(val: number | string): void {
    const pageNum = typeof val === 'string' ? parseInt(val, 10) : val;
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > this.pagesCount) {
      return;
    }
    this.#navigateToPage(pageNum);
  }

  async goToDestination(dest: string | unknown[]): Promise<void> {
    if (!this.#pdfDocument) return;

    let explicitDest: unknown[];
    if (typeof dest === 'string') {
      const resolved = await this.#pdfDocument.getDestination(dest);
      if (!Array.isArray(resolved)) return;
      explicitDest = resolved;
    } else if (Array.isArray(dest)) {
      explicitDest = dest;
    } else {
      return;
    }

    const [destRef] = explicitDest;
    let pageNumber: number | undefined;

    if (destRef && typeof destRef === 'object' && 'num' in destRef) {
      pageNumber = this.#pdfDocument.cachedPageNumber(destRef as { num: number; gen: number });
      if (!pageNumber) {
        try {
          pageNumber = (await this.#pdfDocument.getPageIndex(destRef)) + 1;
        } catch {
          return;
        }
      }
    } else if (Number.isInteger(destRef)) {
      pageNumber = (destRef as number) + 1;
    }

    if (!pageNumber || pageNumber < 1 || pageNumber > this.pagesCount) return;

    this.#navigateToPage(pageNumber);
  }

  getDestinationHash(_dest?: unknown): string {
    return '#';
  }

  getAnchorUrl(_anchor?: string): string {
    return '';
  }

  addLinkAttributes(link: HTMLAnchorElement, url: string, _newWindow?: boolean): void {
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  executeNamedAction(action: string): void {
    switch (action) {
      case 'NextPage':
        this.#navigateToPage(this.#getCurrentPage() + 1);
        break;
      case 'PrevPage':
        this.#navigateToPage(this.#getCurrentPage() - 1);
        break;
      case 'FirstPage':
        this.#navigateToPage(1);
        break;
      case 'LastPage':
        this.#navigateToPage(this.pagesCount);
        break;
      // GoBack, GoForward — no history support, no-ops
    }
  }

  executeSetOCGState(_action: unknown): void {
    // Optional content groups not supported — no-op
  }
}
