<script lang="ts">
  import { onMount } from 'svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { renderThumbnail } from '$lib/pdf/thumbnail';

  let { pageNumber }: { pageNumber: number } = $props();

  let container: HTMLButtonElement;
  let canvasHost: HTMLDivElement;
  let renderedCanvas = $state<HTMLCanvasElement | null>(null);

  // Render token — protects against race conditions when the theme changes
  // rapidly. Each render() call captures the current token value; if a newer
  // render has started by the time the async work completes, the stale one
  // bails out instead of committing its canvas.
  let currentRenderToken = 0;

  // Non-reactive flag (plain `let`, NOT $state) tracking whether render() has
  // ever been dispatched — either in-flight or completed. Used by the theme
  // effect to decide whether to start a fresh render on theme change.
  //
  // CRITICAL: this MUST be non-reactive. If the theme effect read a reactive
  // signal like `renderedCanvas` for this check, every render() commit would
  // re-fire the effect, which would call render() again, committing another
  // canvas, re-firing the effect... — infinite loop.
  let renderDispatched = false;

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !renderDispatched) {
            void render();
          }
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(container);
    return () => observer.disconnect();
  });

  // Re-render when the active theme changes (so thumbs match the current
  // theme). Runs only if a render has already been dispatched (in-flight OR
  // completed) — otherwise the initial IntersectionObserver-triggered render
  // will pick up the current theme when it starts.
  $effect(() => {
    void ui.activeThemeId;
    if (renderDispatched && pdf.doc) {
      void render();
    }
  });

  // When a fresh canvas becomes available, swap it into the pure-JS host.
  // The host has no Svelte-managed children — only our imperative writes.
  $effect(() => {
    if (renderedCanvas && canvasHost) {
      canvasHost.replaceChildren(renderedCanvas);
    }
  });

  async function render(): Promise<void> {
    if (!pdf.doc) return;
    // Mark dispatched BEFORE any await, so a theme change that arrives while
    // this render is in flight will see renderDispatched=true and kick off
    // a replacement render (bumping currentRenderToken, which causes this
    // render to bail at its next checkpoint).
    renderDispatched = true;
    const myToken = ++currentRenderToken;
    try {
      const page = await pdf.doc.getPage(pageNumber);
      if (myToken !== currentRenderToken) return;
      const c = document.createElement('canvas');
      await renderThumbnail(page, c);
      if (myToken !== currentRenderToken) return;
      renderedCanvas = c;
    } catch (err) {
      if (myToken !== currentRenderToken) return;
      console.error(`Failed to render thumb ${pageNumber}`, err);
    }
  }

  function handleClick(): void {
    pdf.goToPage(pageNumber);
  }
</script>

<button
  bind:this={container}
  class="thumb"
  class:current={pdf.currentPage === pageNumber}
  onclick={handleClick}
  aria-label={`Go to page ${pageNumber}`}
  aria-current={pdf.currentPage === pageNumber ? 'page' : undefined}
>
  <!-- canvas-host is purely JS-managed: Svelte owns nothing inside it.
       The placeholder appearance comes from CSS :empty, not a nested div. -->
  <div class="canvas-host" bind:this={canvasHost}></div>
  <div class="num">{pageNumber}</div>
</button>

<style>
  .thumb {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px;
    cursor: pointer;
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 4;
    transition: border-color 120ms ease;
    overflow: hidden;
  }

  .thumb:hover {
    border-color: rgba(106, 169, 255, 0.5);
  }

  .thumb.current {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .canvas-host {
    width: 100%;
    height: 100%;
  }

  /* Placeholder: no child element required. When the host has no children
     (pre-render or on render failure) the background shows through. */
  .canvas-host:empty {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
  }

  .canvas-host :global(canvas) {
    display: block;
    width: 100%;
    height: auto;
  }

  .num {
    position: absolute;
    bottom: 4px;
    right: 6px;
    color: var(--text-faint);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    background: rgba(0, 0, 0, 0.6);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
