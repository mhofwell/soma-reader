export interface ShortcutSpec {
  key: string;
  meta?: boolean;
  shift?: boolean;
}

/** Returns true if the keyboard event matches the shortcut. Cmd on Mac, Ctrl elsewhere. */
export function matchShortcut(evt: KeyboardEvent, spec: ShortcutSpec): boolean {
  if (evt.key.toLowerCase() !== spec.key.toLowerCase()) return false;
  if (spec.meta && !(evt.metaKey || evt.ctrlKey)) return false;
  if (!spec.meta && (evt.metaKey || evt.ctrlKey)) return false;
  if (spec.shift && !evt.shiftKey) return false;
  return true;
}
