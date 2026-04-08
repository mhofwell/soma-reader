import { describe, it, expect } from 'vitest';

describe('keyboard', () => {
  it('matchShortcut returns true for matching key combos', async () => {
    const { matchShortcut } = await import('../../src/lib/keyboard');
    const evt = new KeyboardEvent('keydown', { key: 'o', metaKey: true });
    expect(matchShortcut(evt, { key: 'o', meta: true })).toBe(true);
  });

  it('matchShortcut accepts ctrl as meta on non-mac', async () => {
    const { matchShortcut } = await import('../../src/lib/keyboard');
    const evt = new KeyboardEvent('keydown', { key: 'o', ctrlKey: true });
    expect(matchShortcut(evt, { key: 'o', meta: true })).toBe(true);
  });

  it('matchShortcut respects key case-insensitively', async () => {
    const { matchShortcut } = await import('../../src/lib/keyboard');
    const evt = new KeyboardEvent('keydown', { key: 'O', metaKey: true });
    expect(matchShortcut(evt, { key: 'o', meta: true })).toBe(true);
  });

  it('matchShortcut returns false when modifier missing', async () => {
    const { matchShortcut } = await import('../../src/lib/keyboard');
    const evt = new KeyboardEvent('keydown', { key: 'o' });
    expect(matchShortcut(evt, { key: 'o', meta: true })).toBe(false);
  });
});
