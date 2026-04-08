<script lang="ts">
  import { onMount } from 'svelte';
  import EmptyState from './components/EmptyState.svelte';
  import PageView from './components/PageView.svelte';
  import ControlPill from './components/ControlPill.svelte';
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
  {#if !doqReady}
    <div class="loading">Loading…</div>
  {:else if pdf.doc}
    <PageView />
    <ControlPill />
  {:else}
    <EmptyState onFileSelected={handleFile} />
  {/if}
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
</style>
