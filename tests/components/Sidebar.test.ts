import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Sidebar from '../../src/components/Sidebar.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';
import { ui } from '../../src/lib/stores/ui.svelte';

beforeEach(() => {
  pdf.reset();
  ui.reset();
  pdf.setDocument({ numPages: 5 } as any, 'my-paper.pdf');
  // The store defaults to collapsed after reset(); Sidebar tests render
  // the sidebar explicitly, so force-open it for the tests that need
  // the full sidebar visible.
  ui.setSidebarCollapsed(false);
});

describe('Sidebar', () => {
  it('mounts with app name and filename', () => {
    render(Sidebar, { props: { onSwapFile: () => {} } });
    expect(screen.getByText('Soma')).toBeTruthy();
    expect(screen.getByText('my-paper.pdf')).toBeTruthy();
  });

  it('calls onSwapFile when the swap button is clicked', async () => {
    const onSwapFile = vi.fn();
    render(Sidebar, { props: { onSwapFile } });
    const swapBtn = screen.getByRole('button', { name: /open a different pdf/i });
    await fireEvent.click(swapBtn);
    expect(onSwapFile).toHaveBeenCalledOnce();
  });

  it('toggles sidebar via the collapse chevron', async () => {
    render(Sidebar, { props: { onSwapFile: () => {} } });
    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
    expect(ui.sidebarCollapsed).toBe(false);
    await fireEvent.click(collapseBtn);
    expect(ui.sidebarCollapsed).toBe(true);
  });
});
