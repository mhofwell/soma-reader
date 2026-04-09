import { describe, it, expect, beforeAll, vi } from 'vitest';

// doq.init() fetches colors.json relative to api.js's import.meta.url.
// In happy-dom we mock the fetch to return the bundled colors.
import colorsData from '../../src/lib/doq/colors.json';

describe('doq-bridge', () => {
  beforeAll(() => {
    // @ts-expect-error - mocking global fetch
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(colorsData)
      })
    );
  });

  it('lists themes after init', async () => {
    const { initDoq, listThemes } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const themes = listThemes();
    expect(themes.length).toBeGreaterThan(0);
    expect(themes[0]).toHaveProperty('id');
    expect(themes[0]).toHaveProperty('schemeName');
    expect(themes[0]).toHaveProperty('toneName');
  });

  it('finds Nord Polar Night by ID (multi-word tone)', async () => {
    const { initDoq, findThemeById } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const theme = findThemeById('Nord/Polar Night');
    expect(theme).not.toBeNull();
    expect(theme!.schemeName).toBe('Nord');
    expect(theme!.toneName).toBe('Polar Night');
    expect(typeof theme!.schemeIdx).toBe('number');
    expect(typeof theme!.toneIdx).toBe('number');
  });

  it('setActiveTheme works for multi-word tones (regression for doq parser bug)', async () => {
    const { initDoq, findThemeById, setActiveTheme } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const theme = findThemeById('Nord/Polar Night');
    expect(theme).not.toBeNull();
    expect(() => setActiveTheme(theme!)).not.toThrow();
  });

  it('resolveActiveTheme returns the requested theme when it exists', async () => {
    const { initDoq, resolveActiveTheme } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const theme = resolveActiveTheme('Nord/Polar Night');
    expect(theme).not.toBeNull();
    expect(theme!.id).toBe('Nord/Polar Night');
  });

  it('resolveActiveTheme falls back to Firefox/Dark for stale IDs', async () => {
    const { initDoq, resolveActiveTheme } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const theme = resolveActiveTheme('NonexistentScheme/RemovedTone');
    expect(theme).not.toBeNull();
    expect(theme!.id).toBe('Firefox/Dark');
  });

  it('resolveActiveTheme returns the default theme when asked for it directly', async () => {
    const { initDoq, resolveActiveTheme } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const theme = resolveActiveTheme('Firefox/Dark');
    expect(theme).not.toBeNull();
    expect(theme!.id).toBe('Firefox/Dark');
  });

  it('resolveActiveTheme handles empty-string id gracefully (fallback chain)', async () => {
    const { initDoq, resolveActiveTheme } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const theme = resolveActiveTheme('');
    expect(theme).not.toBeNull();
    expect(theme!.id).toBe('Firefox/Dark');
  });

  it('findThemeById is case-sensitive — mismatched case returns null', async () => {
    const { initDoq, findThemeById } = await import('../../src/lib/doq-bridge');
    await initDoq();
    expect(findThemeById('nord/polar night')).toBeNull();
    expect(findThemeById('Nord/Polar Night')).not.toBeNull();
  });

  it('listThemes returns a stable array (can be called repeatedly in templates)', async () => {
    const { initDoq, listThemes } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const a = listThemes();
    const b = listThemes();
    expect(a).toBe(b); // same reference
    expect(a.length).toBeGreaterThan(0);
  });
});
