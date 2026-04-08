import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ErrorOverlay from '../../src/components/ErrorOverlay.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';

beforeEach(() => {
  pdf.reset();
});

describe('ErrorOverlay', () => {
  it('does not render when there is no error', () => {
    const { container } = render(ErrorOverlay);
    expect(container.querySelector('.overlay')).toBeNull();
  });

  it('renders the error message and a reset button when in error state', () => {
    pdf.setError('boom');
    render(ErrorOverlay);
    expect(screen.getByText('boom')).toBeTruthy();
    expect(screen.getByRole('button', { name: /try another pdf/i })).toBeTruthy();
  });

  it('reset button returns the store to idle', async () => {
    pdf.setError('boom');
    render(ErrorOverlay);
    const btn = screen.getByRole('button', { name: /try another pdf/i });
    await fireEvent.click(btn);
    expect(pdf.loadingState).toBe('idle');
  });

  it('Escape key dismisses the error and returns to idle', async () => {
    pdf.setError('boom');
    render(ErrorOverlay);
    expect(pdf.loadingState).toBe('error');
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(pdf.loadingState).toBe('idle');
  });

  it('Escape is a no-op when not in error state', async () => {
    render(ErrorOverlay);
    expect(pdf.loadingState).toBe('idle');
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(pdf.loadingState).toBe('idle');
  });
});
