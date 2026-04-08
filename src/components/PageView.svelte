<script lang="ts">
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { renderPageToCanvas } from '$lib/pdf/renderer';
  import { resolveActiveTheme, setActiveTheme } from '$lib/doq-bridge';

  let canvasContainer: HTMLDivElement;
  let currentRenderToken = 0;
  let renderErrorMessage = $state<string | null>(null);

  // Reactive devicePixelRatio — updated whenever the user moves the window
  // to a different-DPR monitor or changes browser zoom. The render effect
  // depends on this, so DPR changes retrigger a fresh high-DPI render.
  let currentDpr = $state(
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  );

  $effect(() => {
    if (typeof window === 'undefined') return;

    function updateDpr(): void {
      const next = window.devicePixelRatio || 1;
      if (next !== currentDpr) currentDpr = next;
    }

    // Browser resize fires on monitor-change and browser-zoom changes on
    // most OSes. matchMedia against the current DPR catches the edge cases
    // where resize doesn't (e.g., pure OS-level scaling change).
    window.addEventListener('resize', updateDpr);
    const mq = window.matchMedia(`(resolution: ${currentDpr}dppx)`);
    const mqListener = (): void => updateDpr();
    mq.addEventListener('change', mqListener);

    return () => {
      window.removeEventListener('resize', updateDpr);
      mq.removeEventListener('change', mqListener);
    };
  });

  $effect(() => {
    // Reactivity: re-run when these change
    const doc = pdf.doc;
    const page = pdf.currentPage;
    const scale = ui.effectiveScale;
    const themeId = ui.activeThemeId;
    const dpr = currentDpr;

    if (!doc) return;

    const myToken = ++currentRenderToken;

    // Resolve + apply the active theme via the shared fallback chain, and
    // write back to the ui store if it differs (keeps stored ID in sync).
    const theme = resolveActiveTheme(themeId);
    if (theme) {
      setActiveTheme(theme);
      if (theme.id !== themeId) {
        ui.setActiveThemeId(theme.id);
      }
    }
    // If theme is null, doq has zero schemes — light rendering only.

    (async () => {
      try {
        const pdfPage = await doc.getPage(page);
        if (myToken !== currentRenderToken) return; // newer render started

        const canvas = document.createElement('canvas');
        await renderPageToCanvas(pdfPage, canvas, {
          scale,
          dpr,
          cacheId: `page-${page}-${themeId}-${Date.now()}`
        });

        if (myToken !== currentRenderToken) return;
        // Defensive: component may have unmounted between async ticks
        if (!canvasContainer) return;

        renderErrorMessage = null;
        canvasContainer.replaceChildren(canvas);
      } catch (err) {
        if (myToken !== currentRenderToken) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Failed to render page', err);
        // Per spec §9: show a placeholder for the failed page, don't break navigation.
        renderErrorMessage = `This page failed to render (${msg})`;
        if (canvasContainer) {
          canvasContainer.replaceChildren();
        }
      }
    })();
  });
</script>

<div class="page-view" role="region" aria-label="PDF page viewer">
  <!-- aria-live is scoped to the status span only so that canvas replaceChildren
       calls don't trigger screen reader announcements on every page swap.
       Only the "Page X of Y" text content change triggers a polite announcement. -->
  <div class="sr-only" aria-live="polite" aria-atomic="true">
    Page {pdf.currentPage} of {pdf.numPages}
  </div>
  {#if renderErrorMessage}
    <div class="render-error" role="alert">
      <p>{renderErrorMessage}</p>
      <p class="hint">You can still navigate to other pages.</p>
    </div>
  {/if}
  <div class="canvas-container" bind:this={canvasContainer}></div>
</div>

<style>
  .page-view {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 32px 24px 90px 24px; /* bottom padding leaves room for the floating pill */
    background: var(--bg);
    position: relative;
  }

  .canvas-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .canvas-container :global(canvas) {
    display: block;
    border: 1px solid var(--border);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .render-error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px 32px;
    text-align: center;
    max-width: 360px;
    color: var(--text);
  }

  .render-error .hint {
    margin-top: 8px;
    color: var(--text-dim);
    font-size: 12px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
