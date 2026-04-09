import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import EmptyState from '../../src/components/EmptyState.svelte';

describe('EmptyState', () => {
  it('mounts with the subtitle text and keyboard hint', () => {
    const onFileSelected = vi.fn();
    render(EmptyState, { props: { onFileSelected } });
    expect(screen.getByText(/Drop, click, or press/i)).toBeTruthy();
    // ⌘ and o now live in two separate <kbd> keycap elements, so a regex
    // searching for "⌘o" as one node won't find it. Match each separately.
    expect(screen.getByText(/^⌘$/)).toBeTruthy();
    expect(screen.getByText(/^o$/)).toBeTruthy();
  });

  it('exposes the drop zone as a clickable button', () => {
    const onFileSelected = vi.fn();
    render(EmptyState, { props: { onFileSelected } });
    const dropZone = screen.getByRole('button', { name: /open a pdf file/i });
    expect(dropZone).toBeTruthy();
  });

  it('calls onFileSelected when a file is chosen via the input', async () => {
    const onFileSelected = vi.fn();
    const { container } = render(EmptyState, { props: { onFileSelected } });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file] });
    await fireEvent.change(input);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });
});
