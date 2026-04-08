import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// PDF.js sets err.name to the underlying exception class name (e.g.
// 'PasswordException', 'InvalidPDFException'). We classify by err.name rather
// than message regex (brittle across locales) or by importing the classes
// (PasswordException isn't part of pdfjs-dist's public exports as of v4.7).

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
    const name = err instanceof Error ? err.name : '';
    const msg = err instanceof Error ? err.message : String(err);
    switch (name) {
      case 'PasswordException':
        throw new PdfLoadError('This PDF is password-protected.', 'encrypted');
      case 'InvalidPDFException':
        throw new PdfLoadError("Couldn't read this PDF — it might be damaged.", 'corrupt');
      case 'MissingPDFException':
        throw new PdfLoadError('PDF data is missing.', 'missing');
      case 'UnexpectedResponseException':
        throw new PdfLoadError('Network error while loading the PDF.', 'network');
      default:
        throw new PdfLoadError(msg, 'unknown');
    }
  }
}
