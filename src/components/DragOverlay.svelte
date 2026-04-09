<script lang="ts">
  import { ui } from '$lib/stores/ui.svelte';
  import { fade } from 'svelte/transition';
</script>

{#if ui.dragOver}
  <div class="drag-overlay" transition:fade={{ duration: 150 }}>
    <div class="message">Drop to open</div>
  </div>
{/if}

<style>
  .drag-overlay {
    position: fixed;
    inset: 12px;
    /* Drag overlay sits over the empty/reader state — recolor to the hero's
       purple register so it visually connects to the wordmark + drop-zone
       glow instead of clashing with them. */
    border: 2px dashed var(--accent-2);
    border-radius: 20px;
    background: rgba(184, 148, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
    pointer-events: none;
  }

  .message {
    color: var(--accent-2);
    font-size: 16px;
    font-weight: 500;
    background: color-mix(in srgb, var(--surface-0) 85%, transparent);
    padding: 12px 24px;
    border-radius: 999px;
    border: 1px solid rgba(184, 148, 255, 0.35);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
</style>
