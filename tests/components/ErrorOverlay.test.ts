import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ErrorOverlay from '../../src/components/ErrorOverlay.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';
import { ui } from '../../src/lib/stores/ui.svelte';

beforeEach(() => {
  pdf.reset();
  ui.reset();
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

  it('Escape does NOT reset the document while the theme popover is open', async () => {
    // Regression for: both ErrorOverlay and ThemePopover have window-level
    // Escape handlers. If both were active simultaneously, pressing Esc to
    // dismiss the popover would ALSO destructively reset the document.
    pdf.setError('load failed');
    ui.setThemePopoverOpen(true);
    render(ErrorOverlay);

    expect(pdf.loadingState).toBe('error');
    await fireEvent.keyDown(window, { key: 'Escape' });

    // The error state should still be 'error' — only the popover (not
    // mounted in this test) would have closed. The document stays.
    expect(pdf.loadingState).toBe('error');
  });
});
