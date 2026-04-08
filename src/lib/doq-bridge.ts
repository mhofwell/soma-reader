import doqDefault from './doq/doq.js';
import colorsData from './doq/colors.json';
import type { Theme, ThemeId, DoqColorScheme } from '../types';

// doq's API surface (untyped JS)
interface DoqAPI {
  init(themes?: DoqColorScheme[]): Promise<void>;
  setTheme(arg: [number, number] | string): void;
  enable(): void;
  disable(): void;
}

const doq = doqDefault as unknown as DoqAPI;

let initialized = false;
let themes: Theme[] = [];

export async function initDoq(): Promise<void> {
  if (initialized) return;

  // Pass themes explicitly to avoid the relative-fetch issue when bundled.
  await doq.init(colorsData as DoqColorScheme[]);

  themes = (colorsData as DoqColorScheme[]).flatMap((scheme, schemeIdx) =>
    scheme.tones.map((tone, toneIdx) => ({
      id: `${scheme.name}/${tone.name}`,
      schemeName: scheme.name,
      toneName: tone.name,
      schemeIdx,
      toneIdx,
      background: tone.background,
      foreground: tone.foreground
    }))
  );

  initialized = true;
}

export function listThemes(): Theme[] {
  return themes;
}

export function findTheme(schemeName: string, toneName: string): Theme | null {
  return themes.find((t) => t.schemeName === schemeName && t.toneName === toneName) ?? null;
}

export function findThemeById(id: ThemeId): Theme | null {
  return themes.find((t) => t.id === id) ?? null;
}

/**
 * Apply a theme. Always uses the array form [schemeIdx, toneIdx] to avoid
 * doq's string parser bug with multi-word tone names like "Polar Night".
 * Calling setTheme also enables the engine.
 */
export function setActiveTheme(theme: Theme): void {
  doq.setTheme([theme.schemeIdx, theme.toneIdx]);
}

export function enableDoq(): void {
  doq.enable();
}

export function disableDoq(): void {
  doq.disable();
}
