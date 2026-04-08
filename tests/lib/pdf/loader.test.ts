import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pdfjs-dist', () => {
  const fakeDoc = { numPages: 32 };
  // Define stub exception classes that match pdfjs-dist's real names so
  // instanceof checks in the loader can work in tests too.
  class PasswordException extends Error {}
  class InvalidPDFException extends Error {}
  class MissingPDFException extends Error {}
  class UnexpectedResponseException extends Error {}
  return {
    getDocument: vi.fn(() => ({ promise: Promise.resolve(fakeDoc) })),
    GlobalWorkerOptions: { workerSrc: '' },
    PasswordException,
    InvalidPDFException,
    MissingPDFException,
    UnexpectedResponseException
  };
});

beforeEach(() => {
  vi.resetModules();
});

describe('pdf/loader', () => {
  it('loadPdfFromBuffer returns a PDFDocumentProxy', async () => {
    const { loadPdfFromBuffer } = await import('../../../src/lib/pdf/loader');
    const buf = new ArrayBuffer(8);
    const doc = await loadPdfFromBuffer(buf);
    expect(doc.numPages).toBe(32);
  });

  it('loadPdfFromFile reads file then loads', async () => {
    const { loadPdfFromFile } = await import('../../../src/lib/pdf/loader');
    const file = new File([new Uint8Array([1, 2, 3])], 'test.pdf', { type: 'application/pdf' });
    const doc = await loadPdfFromFile(file);
    expect(doc.numPages).toBe(32);
  });

  it('rejects non-PDF files', async () => {
    const { loadPdfFromFile } = await import('../../../src/lib/pdf/loader');
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    await expect(loadPdfFromFile(file)).rejects.toThrow(/not a pdf/i);
  });
});
