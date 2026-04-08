import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(async () => {
  localStorage.clear();
  const mod = await import('../../src/lib/stores/ui.svelte');
  mod.ui.reset();
});

describe('ui store', () => {
  it('starts with default zoom 100% (index 2)', async () => {
    const { ui, ZOOM_LEVELS } = await import('../../src/lib/stores/ui.svelte');
    expect(ui.zoomIndex).toBe(2);
    expect(ZOOM_LEVELS[ui.zoomIndex]).toBe(1);
    expect(ui.effectiveScale).toBe(1.5); // BASE_SCALE = 1.5
  });

  it('zoomIn / zoomOut clamp at boundaries', async () => {
    const { ui, ZOOM_LEVELS } = await import('../../src/lib/stores/ui.svelte');
    for (let i = 0; i < 20; i++) ui.zoomIn();
    expect(ui.zoomIndex).toBe(ZOOM_LEVELS.length - 1);
    for (let i = 0; i < 20; i++) ui.zoomOut();
    expect(ui.zoomIndex).toBe(0);
  });

  it('canZoomIn and canZoomOut reflect zoom boundaries', async () => {
    const { ui, ZOOM_LEVELS } = await import('../../src/lib/stores/ui.svelte');
    // Default zoom (index 2) — both directions available
    expect(ui.canZoomIn).toBe(true);
    expect(ui.canZoomOut).toBe(true);
    // Zoom to the max
    for (let i = 0; i < ZOOM_LEVELS.length; i++) ui.zoomIn();
    expect(ui.canZoomIn).toBe(false);
    expect(ui.canZoomOut).toBe(true);
    // Zoom to the min
    for (let i = 0; i < ZOOM_LEVELS.length; i++) ui.zoomOut();
    expect(ui.canZoomIn).toBe(true);
    expect(ui.canZoomOut).toBe(false);
  });

  it('resetZoom sets to 100%', async () => {
    const { ui } = await import('../../src/lib/stores/ui.svelte');
    ui.zoomIn();
    ui.zoomIn();
    ui.resetZoom();
    expect(ui.zoomIndex).toBe(2);
  });

  it('setSidebarCollapsed persists to localStorage', async () => {
    const { ui } = await import('../../src/lib/stores/ui.svelte');
    ui.setSidebarCollapsed(true);
    expect(ui.sidebarCollapsed).toBe(true);
    expect(localStorage.getItem('pdfdark.sidebarCollapsed')).toBe('true');
  });

  it('setActiveThemeId persists', async () => {
    const { ui } = await import('../../src/lib/stores/ui.svelte');
    ui.setActiveThemeId('Nord/Polar Night');
    expect(ui.activeThemeId).toBe('Nord/Polar Night');
    expect(localStorage.getItem('pdfdark.activeThemeId')).toBe('"Nord/Polar Night"');
  });
});
