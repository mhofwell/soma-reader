import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(async () => {
  // Reset module state between tests
  const mod = await import('../../src/lib/stores/pdf.svelte');
  mod.pdf.reset();
});

describe('pdf store', () => {
  it('starts in idle state with no doc', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    expect(pdf.doc).toBeNull();
    expect(pdf.numPages).toBe(0);
    expect(pdf.currentPage).toBe(1);
    expect(pdf.loadingState).toBe('idle');
  });

  it('setDocument populates doc, numPages, resets currentPage', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    const fakeDoc = { numPages: 32 } as any;
    pdf.setDocument(fakeDoc, 'test.pdf');
    expect(pdf.doc).toBe(fakeDoc);
    expect(pdf.numPages).toBe(32);
    expect(pdf.currentPage).toBe(1);
    expect(pdf.filename).toBe('test.pdf');
    expect(pdf.loadingState).toBe('ready');
  });

  it('goToPage clamps to [1, numPages]', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    pdf.setDocument({ numPages: 5 } as any, 'a.pdf');
    pdf.goToPage(3);
    expect(pdf.currentPage).toBe(3);
    pdf.goToPage(0);
    expect(pdf.currentPage).toBe(1);
    pdf.goToPage(99);
    expect(pdf.currentPage).toBe(5);
  });

  it('nextPage / prevPage respect boundaries', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    pdf.setDocument({ numPages: 3 } as any, 'a.pdf');
    pdf.nextPage();
    expect(pdf.currentPage).toBe(2);
    pdf.nextPage();
    pdf.nextPage();
    expect(pdf.currentPage).toBe(3); // capped
    pdf.prevPage();
    expect(pdf.currentPage).toBe(2);
    pdf.prevPage();
    pdf.prevPage();
    expect(pdf.currentPage).toBe(1); // capped
  });

  it('setError moves to error state', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    pdf.setError('boom');
    expect(pdf.loadingState).toBe('error');
    expect(pdf.errorMessage).toBe('boom');
  });
});
