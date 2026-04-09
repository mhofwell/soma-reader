export type ThemeId = string; // Format: "scheme/tone", e.g. "Nord/Polar Night"

export interface Theme {
  id: ThemeId;
  displayName: string;
  schemeName: string;
  toneName: string;
  schemeIdx: number;
  toneIdx: number;
  background: string;
  foreground: string;
}

export interface DoqColorScheme {
  name: string;
  tones: Array<{
    name: string;
    background: string;
    foreground: string;
    accents?: string[];
  }>;
  accents?: string[];
}

export type LoadingState =
  | 'idle'
  | 'reading-file'
  | 'parsing'
  | 'ready'
  | 'error';
