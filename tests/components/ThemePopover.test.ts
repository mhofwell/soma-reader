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
});
