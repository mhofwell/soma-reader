import { describe, it, expect, beforeEach, vi } from 'vitest';

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

  it('setDocument calls destroy() on the previous doc', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    const destroyOld = vi.fn().mockResolvedValue(undefined);
    const destroyNew = vi.fn().mockResolvedValue(undefined);
    const oldDoc = { numPages: 10, destroy: destroyOld } as any;
    const newDoc = { numPages: 20, destroy: destroyNew } as any;

    pdf.setDocument(oldDoc, 'old.pdf');
    expect(destroyOld).not.toHaveBeenCalled();

    pdf.setDocument(newDoc, 'new.pdf');
    expect(destroyOld).toHaveBeenCalledOnce();
    expect(destroyNew).not.toHaveBeenCalled();
    expect(pdf.doc).toBe(newDoc);
  });

  it('setDocument does NOT destroy the same doc passed twice', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    const destroy = vi.fn().mockResolvedValue(undefined);
    const doc = { numPages: 10, destroy } as any;

    pdf.setDocument(doc, 'a.pdf');
    pdf.setDocument(doc, 'a.pdf');
    expect(destroy).not.toHaveBeenCalled();
  });

  it('reset calls destroy() on the current doc', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    const destroy = vi.fn().mockResolvedValue(undefined);
    pdf.setDocument({ numPages: 5, destroy } as any, 'a.pdf');
    expect(destroy).not.toHaveBeenCalled();
    pdf.reset();
    expect(destroy).toHaveBeenCalledOnce();
    expect(pdf.doc).toBeNull();
  });

  it('reset is a no-op for destroy when idle', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    // Fresh state — no doc set, reset should not throw
    expect(() => pdf.reset()).not.toThrow();
    expect(pdf.doc).toBeNull();
  });

  it('setDocument swallows rejections from destroy() (pdf.js cancellation)', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    // Simulate the real pdf.js behavior: destroy() rejects because of
    // in-flight render task cancellation. Without the .catch() in the
    // store, this would surface as an unhandledrejection.
    const cancellationError = new Error('Rendering cancelled');
    const oldDoc = {
      numPages: 5,
      destroy: vi.fn().mockRejectedValue(cancellationError)
    } as any;
    const newDoc = { numPages: 10, destroy: vi.fn().mockResolvedValue(undefined) } as any;

    let unhandled: unknown = null;
    const handler = (e: PromiseRejectionEvent): void => {
      unhandled = e.reason;
    };
    window.addEventListener('unhandledrejection', handler);

    pdf.setDocument(oldDoc, 'old.pdf');
    pdf.setDocument(newDoc, 'new.pdf');

    // Wait a tick for the rejected destroy() microtask to settle
    await new Promise((resolve) => setTimeout(resolve, 10));

    window.removeEventListener('unhandledrejection', handler);
    expect(unhandled).toBeNull();
    expect(oldDoc.destroy).toHaveBeenCalledOnce();
  });

  it('reset swallows rejections from destroy() (pdf.js cancellation)', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    const cancellationError = new Error('Rendering cancelled');
    const doc = {
      numPages: 5,
      destroy: vi.fn().mockRejectedValue(cancellationError)
    } as any;

    pdf.setDocument(doc, 'a.pdf');

    let unhandled: unknown = null;
    const handler = (e: PromiseRejectionEvent): void => {
      unhandled = e.reason;
    };
    window.addEventListener('unhandledrejection', handler);

    pdf.reset();
    await new Promise((resolve) => setTimeout(resolve, 10));

    window.removeEventListener('unhandledrejection', handler);
    expect(unhandled).toBeNull();
  });
});
