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
    border: 2px dashed var(--accent);
    border-radius: 18px;
    background: rgba(106, 169, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
    pointer-events: none;
  }

  .message {
    color: var(--accent);
    font-size: 16px;
    font-weight: 500;
    background: rgba(15, 15, 16, 0.85);
    padding: 12px 24px;
    border-radius: 999px;
    border: 1px solid rgba(106, 169, 255, 0.3);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
</style>
