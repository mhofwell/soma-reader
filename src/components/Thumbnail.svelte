<script lang="ts">
  import { onMount } from 'svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { renderThumbnail } from '$lib/pdf/thumbnail';

  let { pageNumber }: { pageNumber: number } = $props();

  let container: HTMLButtonElement;
  let canvasHost: HTMLDivElement;
  let renderedCanvas = $state<HTMLCanvasElement | null>(null);
  let rendered = $state(false);

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !rendered) {
            void render();
          }
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(container);
    return () => observer.disconnect();
  });

  // Re-render the thumbnail when the active theme changes
  $effect(() => {
    void ui.activeThemeId;
    if (rendered && pdf.doc) {
      rendered = false;
      void render();
    }
  });

  // When a fresh canvas is rendered, swap it into the host via direct DOM
  // (no innerHTML — eliminates any XSS surface)
  $effect(() => {
    if (renderedCanvas && canvasHost) {
      canvasHost.replaceChildren(renderedCanvas);
    }
  });

  async function render(): Promise<void> {
    if (!pdf.doc) return;
    try {
      const page = await pdf.doc.getPage(pageNumber);
      const c = document.createElement('canvas');
      await renderThumbnail(page, c);
      renderedCanvas = c;
      rendered = true;
    } catch (err) {
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
  <div class="canvas-host" bind:this={canvasHost}>
    {#if !renderedCanvas}
      <div class="placeholder"></div>
    {/if}
  </div>
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

  .canvas-host :global(canvas) {
    display: block;
    width: 100%;
    height: auto;
  }

  .placeholder {
    background: rgba(255, 255, 255, 0.02);
    width: 100%;
    height: 100%;
    border-radius: 2px;
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
