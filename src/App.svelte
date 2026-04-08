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
    if (pdf.loadingState === 'reading-file' || pdf.loadingState === 'parsing') {
      return;
    }
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      pdf.setError(`That's not a PDF: ${file.name}`);
      return;
    }
    try {
      // Distinct loading phases — each await yields, letting the LoadingOverlay
      // observe the state transition. Without splitting these the 'reading-file'
      // state would never be visible (set + immediately overwritten).
      pdf.setLoading('reading-file');
      const buffer = await file.arrayBuffer();
      pdf.setLoading('parsing');
      const doc = await loadPdfFromBuffer(buffer);
      pdf.setDocument(doc, file.name);
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
    ui.setDragOver(true);
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

    // Bail out if the theme popover is open — its own key handlers own
    // Tab/Esc, and page navigation / zoom shortcuts shouldn't fire while
    // the user is navigating the popover with the keyboard.
    if (ui.themePopoverOpen) {
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

<main class="app">
  <LoadingOverlay />
  <ErrorOverlay />
  <DragOverlay />
  {#if !doqReady}
    <div class="loading">Loading…</div>
  {:else if pdf.doc}
    {#if !ui.sidebarCollapsed}
      <Sidebar onSwapFile={() => fileInputForSwap.click()} />
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    {/if}
    <PageView />
    <ControlPill />
  {:else}
    <EmptyState onFileSelected={handleFile} />
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
    background: var(--bg);
  }

  .loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-size: 13px;
  }

  :global(.expand-sidebar-btn) {
    position: fixed;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    width: 18px;
    height: 36px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-left: none;
    border-radius: 0 6px 6px 0;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 90;
    transition: background 120ms ease, color 120ms ease;
  }

  :global(.expand-sidebar-btn):hover {
    background: var(--panel-2);
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
