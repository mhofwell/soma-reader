import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ControlPill from '../../src/components/ControlPill.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';
import { ui } from '../../src/lib/stores/ui.svelte';
import colorsData from '../../src/lib/doq/colors.json';

beforeAll(async () => {
  // @ts-expect-error - mocking global fetch for doq init
  globalThis.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(colorsData) }));
  const { initDoq } = await import('../../src/lib/doq-bridge');
  await initDoq();
});

beforeEach(() => {
  pdf.reset();
  ui.reset();
  pdf.setDocument({ numPages: 32 } as any, 'test.pdf');
});

describe('ControlPill', () => {
  it('mounts and shows current page / total', () => {
    render(ControlPill);
    expect(screen.getByText('1 / 32')).toBeTruthy();
  });

  it('disables the prev button on page 1', () => {
    render(ControlPill);
    const prev = screen.getByRole('button', { name: /previous page/i }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it('shows the current zoom percent', () => {
    render(ControlPill);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('clicking the theme button toggles the popover open state', async () => {
    render(ControlPill);
    const themeBtn = screen.getByRole('button', { name: /theme picker/i });
    expect(ui.themePopoverOpen).toBe(false);
    await fireEvent.click(themeBtn);
    expect(ui.themePopoverOpen).toBe(true);
  });
});
