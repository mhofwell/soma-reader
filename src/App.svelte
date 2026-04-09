<script lang="ts">
  import { onMount } from 'svelte';
  import EmptyState from './components/EmptyState.svelte';
  import PageView from './components/PageView.svelte';
  import ControlPill from './components/ControlPill.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import LoadingOverlay from './components/LoadingOverlay.svelte';
  import ErrorOverlay from './components/ErrorOverlay.svelte';
  import DragOverlay from './components/DragOverlay.svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { CaretRight } from 'phosphor-svelte';
  import { initDoq, resolveActiveTheme, setActiveTheme } from '$lib/doq-bridge';
  import { loadPdfFromBuffer, PdfLoadError } from '$lib/pdf/loader';
  import { matchShortcut } from '$lib/keyboard';

  let doqReady = $state(false);

  onMount(async () => {
    try {
      await initDoq();
      const theme = resolveActiveTheme(ui.activeThemeId);
      if (theme) {
        setActiveTheme(theme);
        // Write back to the ui store if the fallback chain resolved to a
        // different theme than what was persisted. Keeps ui.activeThemeId in
        // sync with what doq is actually applying.
        if (theme.id !== ui.activeThemeId) {
          ui.setActiveThemeId(theme.id);
        }
      }
      // If theme is null, doq has zero schemes — light rendering only.
    } catch (err) {
      console.error('doq init failed', err);
      // Fall back to non-dark rendering — the reader still works.
    } finally {
      doqReady = true;
    }
  });

  async function handleFile(file: File): Promise<void> {
    // Early return if another load is already in progress. Without this
    // guard, a second drop during an in-flight load starts a parallel
    // parse and the slower one wins — confusing the user.
    if (pdf.isLoading) return;
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      pdf.setError(`That's not a PDF: ${file.name}`);
      return;
    }
    try {
      // Distinct loading phases — each await yields, letting the LoadingOverlay
      // observe the state transition. Without splitting these the 'reading-file'
      // state would never be visible (set + immediately overwritten).
      const startTime = performance.now();
      pdf.setFilename(file.name);
      pdf.setLoading('reading-file');
      const buffer = await file.arrayBuffer();
      pdf.setLoading('parsing');
      const doc = await loadPdfFromBuffer(buffer);

      // Minimum visible loading time — even an instant load (small PDF) gets
      // a deliberate breath of loading state so the experience is consistent
      // across file sizes. 500ms feels intentional, not artificial.
      const elapsed = performance.now() - startTime;
      const MIN_LOAD_MS = 500;
      if (elapsed < MIN_LOAD_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_LOAD_MS - elapsed));
      }

      pdf.setDocument(doc, file.name);
      // Auto-expand the sidebar when a PDF finishes loading. Without this
      // the user has to hunt for the expand chevron to see thumbnails.
      ui.setSidebarCollapsed(false);
    } catch (err) {
      if (err instanceof PdfLoadError) {
        pdf.setError(err.message);
      } else {
        pdf.setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
  }

  // Drag counter pattern: increment on dragenter, decrement on dragleave.
  // Avoids the flicker bug with the `relatedTarget === null` check, which
  // can fire spuriously when moving between child elements on some browsers.
  let dragEnterDepth = 0;

  function handleDragEnter(e: DragEvent): void {
    e.preventDefault();
    dragEnterDepth++;
    if (dragEnterDepth === 1) ui.setDragOver(true);
  }

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    dragEnterDepth = Math.max(0, dragEnterDepth - 1);
    if (dragEnterDepth === 0) ui.setDragOver(false);
  }

  async function handleDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    dragEnterDepth = 0;
    ui.setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) await handleFile(file);
  }

  let fileInputForSwap: HTMLInputElement;

  function handleSwapFileChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) void handleFile(file);
    target.value = '';
  }

  function handleGlobalKey(e: KeyboardEvent): void {
    // Bail out if focus is inside an input, textarea, or contenteditable —
    // the user is typing and shouldn't have global shortcuts hijacked.
    const active = document.activeElement as HTMLElement | null;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active?.isContentEditable ?? false)
    ) {
      return;
    }

    // Bail out if the theme popover is CURRENTLY mounted and open. The
    // popover only exists while a PDF is loaded (inside ControlPill, which
    // is only rendered when pdf.doc !== null). ControlPill clears the
    // themePopoverOpen flag onDestroy, but we ALSO check pdf.doc here as
    // belt-and-suspenders — without the pdf.doc check, a stale
    // themePopoverOpen flag (theoretically impossible after the onDestroy
    // fix, but defending in depth) would lock out all shortcuts in the
    // empty state.
    if (ui.themePopoverOpen && pdf.doc !== null) {
      return;
    }

    // Open file picker (empty state or swap)
    if (matchShortcut(e, { key: 'o', meta: true })) {
      e.preventDefault();
      fileInputForSwap.click();
      return;
    }

    // Toggle sidebar (only if a PDF is loaded)
    if (matchShortcut(e, { key: '\\', meta: true })) {
      e.preventDefault();
      if (pdf.doc) ui.toggleSidebar();
      return;
    }

    // Page navigation. preventDefault so the browser's native horizontal
    // scroll on .page-view doesn't fight page navigation at high zoom.
    if (e.key === 'ArrowRight' && pdf.doc) {
      e.preventDefault();
      pdf.nextPage();
      return;
    }
    if (e.key === 'ArrowLeft' && pdf.doc) {
      e.preventDefault();
      pdf.prevPage();
      return;
    }

    // Zoom
    if ((e.key === '+' || e.key === '=') && pdf.doc) {
      e.preventDefault();
      ui.zoomIn();
      return;
    }
    if (e.key === '-' && pdf.doc) {
      e.preventDefault();
      ui.zoomOut();
      return;
    }
    if (e.key === '0' && pdf.doc) {
      e.preventDefault();
      ui.resetZoom();
      return;
    }
  }

  let pillHideTimer: ReturnType<typeof setTimeout> | null = null;
  const PILL_IDLE_MS = 2500;

  function bumpPillVisibility(): void {
    // Fast path: if the pill is already visible AND a hide timer is already
    // queued, just reset the timer without touching the reactive store.
    // This avoids triggering reactivity on every single mousemove event
    // (thousands per second on an active session).
    if (ui.pillVisible && pillHideTimer !== null) {
      clearTimeout(pillHideTimer);
      pillHideTimer = setTimeout(scheduleHide, PILL_IDLE_MS);
      return;
    }
    ui.setPillVisible(true);
    if (pillHideTimer) clearTimeout(pillHideTimer);
    pillHideTimer = setTimeout(scheduleHide, PILL_IDLE_MS);
  }

  function scheduleHide(): void {
    // Don't hide if the popover is open
    if (!ui.themePopoverOpen) {
      ui.setPillVisible(false);
    }
    pillHideTimer = null;
  }
</script>

<svelte:window
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onmousemove={bumpPillVisibility}
  onkeydown={handleGlobalKey}
/>

<main class="app" class:sidebar-collapsed={ui.sidebarCollapsed}>
  <LoadingOverlay />
  <ErrorOverlay />
  <DragOverlay />
  {#if !doqReady}
    <div class="loading">Loading…</div>
  {:else}
    <!-- Sidebar is always rendered. Its collapsed state is driven by a CSS
         class on the sidebar element itself, so width/opacity transitions
         can run smoothly without unmounting/remounting (which used to leave
         the page-view a beat behind). -->
    <Sidebar onSwapFile={() => fileInputForSwap.click()} />
    {#if !ui.sidebarCollapsed}
      <!-- Backdrop only appears at narrow viewports (CSS-controlled) so the
           sidebar drawer can be dismissed by tapping outside on mobile. -->
      <button
        class="sidebar-backdrop"
        aria-label="Close sidebar"
        onclick={() => ui.setSidebarCollapsed(true)}
      ></button>
    {:else}
      <button
        class="expand-sidebar-btn"
        onclick={() => ui.setSidebarCollapsed(false)}
        aria-label="Show sidebar"
      >
        <CaretRight size={16} weight="bold" />
      </button>
    {/if}
    {#if pdf.doc}
      <PageView />
      <ControlPill />
    {:else}
      <EmptyState onFileSelected={handleFile} />
    {/if}
  {/if}

  <input
    bind:this={fileInputForSwap}
    type="file"
    accept="application/pdf,.pdf"
    onchange={handleSwapFileChange}
    hidden
  />
</main>

<style>
  .app {
    height: 100vh;
    display: flex;
    gap: 12px;
    padding: 12px;
    box-sizing: border-box;
    background: var(--bg);
    /* Animate the inter-panel gap together with the sidebar's width so
       collapse/expand reads as a single cohesive motion instead of two
       sequential phases. */
    transition: gap 280ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .app.sidebar-collapsed {
    gap: 0;
  }

  .loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-size: 13px;
  }

  /* Mirrors the sidebar's .collapse-btn: same size, same padding, same
     distance from its panel corner. The collapse chevron is 28px from the
     sidebar's top-right inner edge; this sits 28px from the page-view's
     top-left inner edge. Panel inner edge = 12px app padding + 1px border
     = 13px. Button center at 13 + 28 = 41px, minus 14px half-size = 27px. */
  :global(.expand-sidebar-btn) {
    position: fixed;
    top: 27px;
    left: 27px;
    background: transparent;
    border: none;
    border-radius: 6px;
    padding: 6px;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 90;
    transition: background 120ms ease, color 120ms ease;
  }

  :global(.expand-sidebar-btn):hover {
    background: var(--hover);
    color: var(--text);
  }

  /* Backdrop for the sidebar drawer at narrow viewports. Hidden on desktop. */
  :global(.sidebar-backdrop) {
    display: none;
  }
  @media (max-width: 720px) {
    :global(.sidebar-backdrop) {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 140;
      border: none;
      cursor: pointer;
    }
  }
</style>
