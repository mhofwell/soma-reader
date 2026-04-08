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

  it('appears after the 300ms threshold during loading', async () => {
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

  it('hides when loadingState returns to ready', async () => {
    pdf.setLoading('parsing');
    const { container } = render(LoadingOverlay);
    vi.advanceTimersByTime(350);
    await waitFor(() => expect(container.querySelector('.overlay')).toBeTruthy());
    pdf.setDocument({ numPages: 1 } as any, 'a.pdf');
    await waitFor(() => expect(container.querySelector('.overlay')).toBeNull());
  });
});
