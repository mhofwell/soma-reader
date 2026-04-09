import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import LoadingOverlay from '../../src/components/LoadingOverlay.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';

beforeEach(() => {
  vi.useFakeTimers();
  pdf.reset();
});

describe('LoadingOverlay', () => {
  it('does not render when idle', () => {
    const { container } = render(LoadingOverlay);
    expect(container.querySelector('.overlay')).toBeNull();
  });

  it('does not render during first load (pdf.doc is null) — the EmptyState handles loading visuals in place', async () => {
    pdf.setLoading('parsing');
    const { container } = render(LoadingOverlay);
    vi.advanceTimersByTime(350);
    // Even past the threshold, the overlay should NOT appear when there
    // is no existing document — the EmptyState is handling the loading UI.
    expect(container.querySelector('.overlay')).toBeNull();
  });

  it('appears after the 300ms threshold when swapping (pdf.doc already set)', async () => {
    // Establish an already-loaded document, then start a new load. This is
    // the SWAP scenario, which is the only case where the overlay should show.
    pdf.setDocument({ numPages: 1 } as any, 'existing.pdf');
    pdf.setLoading('parsing');
    const { container } = render(LoadingOverlay);
    // Not visible immediately
    expect(container.querySelector('.overlay')).toBeNull();
    // Advance past the threshold
    vi.advanceTimersByTime(350);
    await waitFor(() => {
      expect(container.querySelector('.overlay')).toBeTruthy();
    });
  });

  it('hides when loadingState returns to ready (during swap)', async () => {
    pdf.setDocument({ numPages: 1 } as any, 'existing.pdf');
    pdf.setLoading('parsing');
    const { container } = render(LoadingOverlay);
    vi.advanceTimersByTime(350);
    await waitFor(() => expect(container.querySelector('.overlay')).toBeTruthy());
    pdf.setDocument({ numPages: 2 } as any, 'new.pdf');
    await waitFor(() => expect(container.querySelector('.overlay')).toBeNull());
  });
});
