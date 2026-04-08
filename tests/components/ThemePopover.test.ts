import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ThemePopover from '../../src/components/ThemePopover.svelte';
import { ui } from '../../src/lib/stores/ui.svelte';
import colorsData from '../../src/lib/doq/colors.json';

beforeAll(async () => {
  // @ts-expect-error - mocking global fetch for doq init
  globalThis.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(colorsData) }));
  const { initDoq } = await import('../../src/lib/doq-bridge');
  await initDoq();
});

beforeEach(() => {
  ui.reset();
});

describe('ThemePopover', () => {
  it('renders nothing when popover is closed', () => {
    const { container } = render(ThemePopover, { props: { triggerRef: null } });
    expect(container.querySelector('.theme-popover')).toBeNull();
  });

  it('renders the theme list when open', () => {
    ui.setThemePopoverOpen(true);
    render(ThemePopover, { props: { triggerRef: null } });
    expect(screen.getByRole('dialog', { name: /theme picker/i })).toBeTruthy();
    // At least one theme option visible
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
  });

  it('auto-focuses the FIRST theme when opened (regression for bind:this-in-each bug)', async () => {
    ui.setThemePopoverOpen(true);
    render(ThemePopover, { props: { triggerRef: null } });
    // Let the auto-focus $effect run
    await new Promise((resolve) => setTimeout(resolve, 0));
    const options = screen.getAllByRole('option') as HTMLButtonElement[];
    expect(options.length).toBeGreaterThan(1);
    // The first option in DOM order should be the focused element,
    // not the last (which was the pre-fix bug from bind:this inside the each loop).
    expect(document.activeElement).toBe(options[0]);
    expect(document.activeElement).not.toBe(options[options.length - 1]);
  });
});
