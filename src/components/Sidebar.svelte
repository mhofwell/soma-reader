<script lang="ts">
  import ThumbnailList from './ThumbnailList.svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { fly } from 'svelte/transition';

  let { onSwapFile }: { onSwapFile: () => void } = $props();
</script>

<aside class="sidebar" transition:fly={{ x: -200, duration: 250 }}>
  <header class="header">
    <div class="app-row">
      <div class="logo"></div>
      <div class="name">PDF Dark</div>
    </div>
    <div class="filename-row">
      <span class="filename" title={pdf.filename}>{pdf.filename}</span>
      <button class="swap-btn" onclick={onSwapFile} aria-label="Open a different PDF">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 3h5v5"></path>
          <path d="M21 3l-7 7"></path>
          <path d="M8 21H3v-5"></path>
          <path d="M3 21l7-7"></path>
        </svg>
      </button>
    </div>
  </header>

  <div class="pages-label">Pages</div>
  <div class="thumbs-scroll">
    <ThumbnailList />
  </div>

  <button class="collapse-btn" onclick={() => ui.toggleSidebar()} aria-label="Collapse sidebar">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  </button>
</aside>

<style>
  .sidebar {
    width: 200px;
    background: var(--panel);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    /* NOTE: do NOT set overflow:hidden here — the collapse chevron
       intentionally extends past the right edge with right:-10px and would be
       clipped. Scrolling for the thumbnail list is on .thumbs-scroll only. */
    position: relative;
  }

  .header {
    padding: 14px 14px 12px 14px;
    border-bottom: 1px solid #1f1f24;
  }

  .app-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo {
    width: 22px;
    height: 22px;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    border-radius: 5px;
  }

  .name {
    color: var(--text);
    font-size: 12px;
    font-weight: 600;
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
    background: rgba(255, 255, 255, 0.05);
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

  .collapse-btn {
    position: absolute;
    top: 50%;
    right: -10px;
    transform: translateY(-50%);
    width: 20px;
    height: 36px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0 6px 6px 0;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: background 120ms ease, color 120ms ease;
  }

  .collapse-btn:hover {
    background: var(--panel-2);
    color: var(--text);
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
