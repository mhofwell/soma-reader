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

  it('finds Nord Polar Night by name (multi-word tone)', async () => {
    const { initDoq, findTheme } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const theme = findTheme('Nord', 'Polar Night');
    expect(theme).not.toBeNull();
    expect(theme!.schemeName).toBe('Nord');
    expect(theme!.toneName).toBe('Polar Night');
    expect(typeof theme!.schemeIdx).toBe('number');
    expect(typeof theme!.toneIdx).toBe('number');
  });

  it('setActiveTheme works for multi-word tones (regression for doq parser bug)', async () => {
    const { initDoq, findTheme, setActiveTheme } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const theme = findTheme('Nord', 'Polar Night');
    expect(theme).not.toBeNull();
    expect(() => setActiveTheme(theme!)).not.toThrow();
  });
});
