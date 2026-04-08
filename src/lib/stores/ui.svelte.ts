import { readPersisted, writePersisted } from '../persist';
import type { ThemeId } from '../../types';

export const BASE_SCALE = 1.5; // 100% = scale 1.5 (Adobe-style "actual size")
// `as const` freezes the array at the type level (readonly) so external code
// can't accidentally mutate it and break the derived canZoomIn/canZoomOut.
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const;
const DEFAULT_ZOOM_INDEX = ZOOM_LEVELS.indexOf(1);
// Runtime assertion: if a future change removes 1.0 from ZOOM_LEVELS,
// indexOf returns -1 and everything downstream silently breaks
// (effectiveScale becomes NaN). Fail loud at module load instead.
if (DEFAULT_ZOOM_INDEX < 0) {
  throw new Error('ZOOM_LEVELS must contain 1.0 for the 100% default to work');
}
const DEFAULT_THEME_ID: ThemeId = 'Firefox/Dark';

class UiStore {
  zoomIndex = $state(DEFAULT_ZOOM_INDEX);
  sidebarCollapsed = $state(readPersisted<boolean>('sidebarCollapsed', false));
  activeThemeId = $state<ThemeId>(readPersisted<ThemeId>('activeThemeId', DEFAULT_THEME_ID));
  pillVisible = $state(true);
  themePopoverOpen = $state(false);
  dragOver = $state(false);

  effectiveScale = $derived(ZOOM_LEVELS[this.zoomIndex] * BASE_SCALE);
  zoomPercent = $derived(Math.round(ZOOM_LEVELS[this.zoomIndex] * 100));
  canZoomIn = $derived(this.zoomIndex < ZOOM_LEVELS.length - 1);
  canZoomOut = $derived(this.zoomIndex > 0);

  zoomIn(): void {
    if (this.canZoomIn) this.zoomIndex++;
  }

  zoomOut(): void {
    if (this.canZoomOut) this.zoomIndex--;
  }

  resetZoom(): void {
    this.zoomIndex = DEFAULT_ZOOM_INDEX;
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
    writePersisted('sidebarCollapsed', collapsed);
  }

  toggleSidebar(): void {
    this.setSidebarCollapsed(!this.sidebarCollapsed);
  }

  setActiveThemeId(id: ThemeId): void {
    this.activeThemeId = id;
    writePersisted('activeThemeId', id);
  }

  setPillVisible(v: boolean): void {
    this.pillVisible = v;
  }

  setThemePopoverOpen(o: boolean): void {
    this.themePopoverOpen = o;
  }

  setDragOver(d: boolean): void {
    this.dragOver = d;
  }

  reset(): void {
    this.zoomIndex = DEFAULT_ZOOM_INDEX;
    this.sidebarCollapsed = false;
    this.activeThemeId = DEFAULT_THEME_ID;
    this.pillVisible = true;
    this.themePopoverOpen = false;
    this.dragOver = false;
  }
}

export const ui = new UiStore();
