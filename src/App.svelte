<script lang="ts">
  import { onMount } from 'svelte';
  import EmptyState from './components/EmptyState.svelte';
  import PageView from './components/PageView.svelte';
  import ControlPill from './components/ControlPill.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import LoadingOverlay from './components/LoadingOverlay.svelte';
  import ErrorOverlay from './components/ErrorOverlay.svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { initDoq, findThemeById, setActiveTheme, listThemes } from '$lib/doq-bridge';
  import { loadPdfFromBuffer, PdfLoadError } from '$lib/pdf/loader';

  let doqReady = $state(false);

  onMount(async () => {
    try {
      await initDoq();
      // Theme fallback chain: stored ID → default → first available.
      // doq.enable() throws if no theme has been set, so we MUST resolve to
      // an actual theme before any rendering occurs.
      const theme =
        findThemeById(ui.activeThemeId) ??
        findThemeById('Firefox/Dark') ??
        listThemes()[0] ??
        null;
      if (theme) {
        setActiveTheme(theme);
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

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    ui.setDragOver(true);
  }

  function handleDragLeave(e: DragEvent): void {
    // Only clear when leaving the window entirely
    if (e.relatedTarget === null) {
      ui.setDragOver(false);
    }
  }

  async function handleDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
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

  let pillHideTimer: ReturnType<typeof setTimeout> | null = null;
  const PILL_IDLE_MS = 2500;

  function bumpPillVisibility(): void {
    ui.setPillVisible(true);
    if (pillHideTimer) clearTimeout(pillHideTimer);
    pillHideTimer = setTimeout(() => {
      // Don't hide if the popover is open
      if (!ui.themePopoverOpen) {
        ui.setPillVisible(false);
      }
    }, PILL_IDLE_MS);
  }
</script>

<svelte:window
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onmousemove={bumpPillVisibility}
/>

<main class="app">
  <LoadingOverlay />
  <ErrorOverlay />
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
