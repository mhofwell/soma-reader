<script lang="ts">
  import ThumbnailList from './ThumbnailList.svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { FilePlus, CaretLeft } from 'phosphor-svelte';

  let { onSwapFile }: { onSwapFile: () => void } = $props();
</script>

<aside class="sidebar" class:collapsed={ui.sidebarCollapsed}>
  <header class="header">
    <div class="app-row">
      <img class="logo" src="/soma-logo.png" alt="Soma logo" />
      <div class="name">Soma</div>
      <button
        class="collapse-btn"
        onclick={() => ui.toggleSidebar()}
        aria-label="Collapse sidebar"
      >
        <CaretLeft size={16} weight="bold" />
      </button>
    </div>
    {#if pdf.doc}
      <div class="filename-row">
        <span class="filename" title={pdf.filename}>{pdf.filename}</span>
        <button class="swap-btn" onclick={onSwapFile} aria-label="Open a different PDF">
          <FilePlus size={16} weight="regular" />
        </button>
      </div>
    {/if}
  </header>

  {#if pdf.doc}
    <div class="pages-label">Pages</div>
    <div class="thumbs-scroll">
      <ThumbnailList />
    </div>
  {:else}
    <div class="empty-placeholder">No PDF loaded</div>
  {/if}
</aside>

<style>
  .sidebar {
    width: 260px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: relative;
    overflow: hidden; /* clips content cleanly during the collapse animation */
    /* contain: layout style tells the browser the sidebar's internal layout
       is isolated — children can't affect the rest of the page and vice
       versa. This lets the browser skip re-laying-out sidebar children
       during the width transition, reducing per-frame layout cost. */
    contain: layout style;
    /* Smooth collapse: width animates 260 → 0, opacity fades, and the
       negative margin-right cancels the .app gap so the page-view slides
       all the way left as a single cohesive motion. */
    transition:
      width 280ms cubic-bezier(0.4, 0, 0.2, 1),
      margin-right 280ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 220ms ease-out,
      border-width 280ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar.collapsed {
    width: 0;
    margin-right: -12px; /* cancels the .app gap when fully collapsed */
    opacity: 0;
    border-width: 0;
    pointer-events: none;
  }

  .header {
    padding: 14px;
    border-bottom: 1px solid var(--border);
  }

  .app-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    /* The PNG itself has a transparent background and a soft purple/lavender
       3D rendering — no need for additional styling. */
  }

  .name {
    /* Sidebar wordmark — same weight/tracking shape as the hero title, but
       solid white instead of the gradient. */
    display: inline-block;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.2;
    color: #ffffff;
  }

  .collapse-btn {
    margin-left: auto;
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 120ms ease, color 120ms ease;
  }

  .collapse-btn:hover {
    background: var(--hover);
    color: var(--text);
  }

  .filename-row {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filename {
    color: var(--text-dim);
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .swap-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 120ms ease, color 120ms ease;
  }

  .swap-btn:hover {
    background: var(--hover);
    color: var(--text);
  }

  .pages-label {
    padding: 12px 14px 8px 14px;
    color: var(--text-faint);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .thumbs-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px 16px 8px;
  }

  .empty-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: var(--text-faint);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: center;
  }

  /* Responsive baseline: on narrow viewports the sidebar becomes a drawer
     overlay so it doesn't eat half the screen on a phone. The reader is not
     mobile-OPTIMIZED in v1 but it should at least not be broken. */
  @media (max-width: 720px) {
    .sidebar {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      width: min(85vw, 280px);
      z-index: 150;
      box-shadow: 8px 0 24px rgba(0, 0, 0, 0.6);
    }
  }
</style>
