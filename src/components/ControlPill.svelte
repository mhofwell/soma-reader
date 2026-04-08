<script lang="ts">
  import { onDestroy } from 'svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import ThemePopover from './ThemePopover.svelte';
  import { fade } from 'svelte/transition';

  let themeBtnRef: HTMLButtonElement | null = $state(null);

  function toggleThemePopover(): void {
    ui.setThemePopoverOpen(!ui.themePopoverOpen);
  }

  // Clear the theme-popover flag when the pill unmounts. ControlPill owns
  // the ThemePopover lifecycle, so if the pill goes away (e.g., pdf.reset()
  // returns the app to the empty state while the popover was open), the
  // flag should NOT persist. Otherwise the global keyboard guard in
  // App.svelte keeps swallowing shortcuts even though no popover exists,
  // and the next loaded document would see themePopoverOpen=true and
  // reopen the popover spuriously.
  onDestroy(() => {
    ui.setThemePopoverOpen(false);
  });
</script>

{#if ui.pillVisible}
  <div class="pill" transition:fade={{ duration: 200 }}>
    <button
      class="pill-btn"
      onclick={() => pdf.prevPage()}
      disabled={pdf.currentPage <= 1}
      aria-label="Previous page"
    >
      ‹
    </button>
    <span class="pill-text">{pdf.currentPage} / {pdf.numPages}</span>
    <button
      class="pill-btn"
      onclick={() => pdf.nextPage()}
      disabled={pdf.currentPage >= pdf.numPages}
      aria-label="Next page"
    >
      ›
    </button>

    <span class="pill-sep"></span>

    <button
      class="pill-btn"
      onclick={() => ui.zoomOut()}
      disabled={!ui.canZoomOut}
      aria-label="Zoom out"
    >
      −
    </button>
    <button
      class="pill-text pill-text-button"
      onclick={() => ui.resetZoom()}
      aria-label="Reset zoom to 100%"
    >
      {ui.zoomPercent}%
    </button>
    <button
      class="pill-btn"
      onclick={() => ui.zoomIn()}
      disabled={!ui.canZoomIn}
      aria-label="Zoom in"
    >
      +
    </button>

    <span class="pill-sep"></span>

    <div class="theme-anchor">
      <button
        bind:this={themeBtnRef}
        class="pill-btn theme-btn"
        class:active={ui.themePopoverOpen}
        onclick={toggleThemePopover}
        aria-label="Theme picker"
        aria-expanded={ui.themePopoverOpen}
        aria-haspopup="dialog"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"></circle>
          <circle cx="7.5" cy="10.5" r="1" fill="currentColor"></circle>
          <circle cx="12" cy="7.5" r="1" fill="currentColor"></circle>
          <circle cx="16.5" cy="10.5" r="1" fill="currentColor"></circle>
          <circle cx="14" cy="15.5" r="1" fill="currentColor"></circle>
        </svg>
      </button>
      <ThemePopover triggerRef={themeBtnRef} />
    </div>
  </div>
{/if}

<style>
  .pill {
    position: fixed;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(28, 28, 32, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    padding: 6px 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
    z-index: 100;
  }

  .pill-btn {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: transparent;
    border: none;
    color: #c0c0c8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: background 120ms ease;
  }

  .pill-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
  }

  .pill-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .pill-btn.active {
    background: rgba(106, 169, 255, 0.16);
    color: var(--accent);
  }

  .pill-text {
    color: #c0c0c8;
    font-size: 11px;
    padding: 0 8px;
    font-variant-numeric: tabular-nums;
    min-width: 36px;
    text-align: center;
    line-height: 28px;
  }

  .pill-text-button {
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 14px;
    font-family: inherit;
    transition: background 120ms ease;
  }

  .pill-text-button:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .pill-sep {
    width: 1px;
    height: 18px;
    background: rgba(255, 255, 255, 0.08);
    margin: 0 4px;
  }

  .theme-anchor {
    position: relative;
  }
</style>
