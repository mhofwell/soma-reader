<script lang="ts">
  import ThumbnailList from './ThumbnailList.svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { FilePlus, CaretLeft } from 'phosphor-svelte';

  let { onSwapFile }: { onSwapFile: () => void } = $props();
</script>

<aside class="sidebar" class:collapsed={ui.sidebarCollapsed}>
  <div class="sidebar-inner">
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
    <div class="empty-placeholder">
      <blockquote class="definition">
        <div class="def-head">
          <span class="word">soma</span>
          <span class="ipa">/ˈsoʊ.mə/</span>
          <span class="pos">n.</span>
        </div>
        <p class="def-body">The state reached when friction between reader and text disappears — the page goes dark, the type sharpens, and nothing competes for attention.</p>
        <cite class="def-cite">cf. Huxley, <em>Brave New World</em>, 1932</cite>
      </blockquote>

      <div class="shortcuts">
        <div class="shortcuts-label">Shortcuts</div>
        <ul class="shortcut-list">
          <li><kbd>⌘</kbd><kbd>o</kbd><span>Open PDF</span></li>
          <li><kbd>Space</kbd><span>Toggle sidebar</span></li>
          <li><kbd>←</kbd><kbd>→</kbd><span>Prev / next page</span></li>
          <li><kbd>+</kbd><kbd>−</kbd><span>Zoom in / out</span></li>
          <li><kbd>0</kbd><span>Reset zoom</span></li>
        </ul>
      </div>
    </div>
  {/if}
  </div>
</aside>

<style>
  .sidebar-inner {
    width: 260px;
    min-width: 260px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

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
      opacity 220ms ease-out,
      border-width 280ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar.collapsed {
    width: 0;
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px 28px 44px;
  }

  .definition {
    margin: 0;
    padding: 0;
    max-width: 220px;
  }

  .def-head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .word {
    font-size: 18px;
    font-weight: 600;
    font-style: italic;
    color: var(--text-dim);
    letter-spacing: -0.02em;
  }

  .ipa {
    font-size: 12px;
    color: var(--text-faint);
    letter-spacing: 0.01em;
  }

  .pos {
    font-size: 12px;
    font-style: italic;
    color: var(--text-faint);
  }

  .def-body {
    margin: 0 0 10px 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-faint);
    letter-spacing: -0.005em;
  }

  .def-cite {
    font-size: 11px;
    color: var(--text-faint);
    font-style: normal;
  }

  .shortcuts {
    margin-top: 40px;
    width: 100%;
  }

  .shortcuts-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    margin-bottom: 10px;
    text-align: center;
  }

  .shortcut-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .shortcut-list li {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-faint);
  }

  .shortcut-list li span {
    margin-left: auto;
  }

  .shortcut-list kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 5px;
    font-family: -apple-system, "SF Mono", monospace;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-dim);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.06) 0%,
      rgba(255, 255, 255, 0.02) 100%
    );
    border: 1px solid var(--border);
    border-radius: 4px;
    box-shadow:
      inset 0 -1px 0 rgba(0, 0, 0, 0.4),
      0 1px 1px rgba(0, 0, 0, 0.25);
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
