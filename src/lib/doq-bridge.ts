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

// User-friendly display names keyed by internal doq ID. The internal IDs
// (e.g. "Firefox/Dark") are browser-reference labels from doq's upstream
// source — meaningless to end users. These names describe the actual color.
const DISPLAY_NAMES: Record<string, string> = {
  'Chrome/Yellow':    'Amber',
  'Chrome/Blue':      'Frost',
  'Chrome/Dark':      'Charcoal',
  'Firefox/Sepia':    'Linen',
  'Firefox/Dark':     'Nightshade',
  'Safari/Sepia':     'Parchment',
  'Safari/Gray':      'Slate',
  'Safari/Night':     'Ink',
  'Nord/Snow Storm':  'Snowdrift',
  'Nord/Polar Night': 'Arctic',
  'Solarized/Light':  'Solstice',
};

// Themes to exclude from the picker entirely (quality issues, e.g. poor
// link contrast on dark backgrounds).
const EXCLUDED_THEMES = new Set(['Solarized/Dark']);

export async function initDoq(): Promise<void> {
  if (initialized) return;

  // Pass themes explicitly to avoid the relative-fetch issue when bundled.
  await doq.init(colorsData as DoqColorScheme[]);

  themes = (colorsData as DoqColorScheme[]).flatMap((scheme, schemeIdx) =>
    scheme.tones.map((tone, toneIdx) => ({
      id: `${scheme.name}/${tone.name}`,
      displayName: DISPLAY_NAMES[`${scheme.name}/${tone.name}`] ?? `${scheme.name} ${tone.name}`,
      schemeName: scheme.name,
      toneName: tone.name,
      schemeIdx,
      toneIdx,
      background: tone.background,
      foreground: tone.foreground
    }))
  ).filter((t) => !EXCLUDED_THEMES.has(t.id));

  initialized = true;
}

export function listThemes(): Theme[] {
  return themes;
}

export function findThemeById(id: ThemeId): Theme | null {
  return themes.find((t) => t.id === id) ?? null;
}

export const DEFAULT_THEME_ID: ThemeId = 'Firefox/Dark';

/**
 * Single source of truth for theme resolution with fallback.
 *
 * Tries: the preferred ID → the default (Firefox/Dark) → the first available
 * theme → null if doq has no themes at all.
 *
 * Callers should compare the returned theme's `id` against `preferredId` and
 * write back to the ui store if they differ, so the stored theme stays in
 * sync with the actually-applied theme.
 */
export function resolveActiveTheme(preferredId: ThemeId): Theme | null {
  return (
    findThemeById(preferredId) ??
    findThemeById(DEFAULT_THEME_ID) ??
    themes[0] ??
    null
  );
}

/**
 * Apply a theme. Always uses the array form [schemeIdx, toneIdx] to avoid
 * doq's string parser bug with multi-word tone names like "Polar Night".
 * Calling setTheme also enables the engine.
 */
export function setActiveTheme(theme: Theme): void {
  doq.setTheme([theme.schemeIdx, theme.toneIdx]);
}

