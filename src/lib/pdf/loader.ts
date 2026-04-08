import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// PDF.js exports specific error classes — use instanceof rather than regex
// matching against err.message, which is brittle across versions and locales.
import {
  PasswordException,
  InvalidPDFException,
  MissingPDFException,
  UnexpectedResponseException
} from 'pdfjs-dist';

// Set up the PDF.js worker. Vite will resolve this URL at build time.
// In tests, this is harmless because we mock pdfjs-dist entirely.
// NOTE: The worker path is sensitive to pdfjs-dist's internal layout. v4.7.x
// uses build/pdf.worker.min.mjs — verify this still exists when bumping versions.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export type PdfLoadErrorKind =
  | 'not-a-pdf'
  | 'corrupt'
  | 'encrypted'
  | 'missing'
  | 'network'
  | 'unknown';

export class PdfLoadError extends Error {
  constructor(
    message: string,
    public readonly kind: PdfLoadErrorKind
  ) {
    super(message);
    this.name = 'PdfLoadError';
  }
}

export async function loadPdfFromFile(file: File): Promise<PDFDocumentProxy> {
  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new PdfLoadError(`That's not a PDF: ${file.name}`, 'not-a-pdf');
  }
  const buffer = await file.arrayBuffer();
  return loadPdfFromBuffer(buffer);
}

export async function loadPdfFromBuffer(buffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  try {
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
    return doc;
  } catch (err) {
    if (err instanceof PasswordException) {
      throw new PdfLoadError('This PDF is password-protected.', 'encrypted');
    }
    if (err instanceof InvalidPDFException) {
      throw new PdfLoadError("Couldn't read this PDF — it might be damaged.", 'corrupt');
    }
    if (err instanceof MissingPDFException) {
      throw new PdfLoadError('PDF data is missing.', 'missing');
    }
    if (err instanceof UnexpectedResponseException) {
      throw new PdfLoadError('Network error while loading the PDF.', 'network');
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new PdfLoadError(msg, 'unknown');
  }
}
