<script lang="ts">
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';

  function handleReset(): void {
    // "Try another PDF" is an explicit destructive action — reset everything.
    pdf.reset();
  }

  function handleKey(e: KeyboardEvent): void {
    // Escape dismisses the error overlay non-destructively.
    //
    // If a document is currently loaded (e.g., the error came from a failed
    // SWAP attempt — `pdf.doc` still points at the previously loaded doc),
    // clearError() only resets the error state and leaves the document intact.
    // The user goes back to reading whatever they had open before.
    //
    // If no document is loaded (e.g., the error came from the very first
    // load attempt), clearError() returns to 'idle' which shows the empty
    // state. Either way, the Escape is NEVER destructive to an open doc.
    //
    // Also gated on !themePopoverOpen so simultaneous open overlays don't
    // double-handle Escape (the popover's own Esc handler wins).
    if (
      e.key === 'Escape' &&
      pdf.loadingState === 'error' &&
      !ui.themePopoverOpen
    ) {
      e.preventDefault();
      pdf.clearError();
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if pdf.loadingState === 'error'}
  <div class="overlay" role="alert">
    <div class="card">
      <div class="icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div class="message">{pdf.errorMessage || 'Something went wrong.'}</div>
      <button class="reset-btn" onclick={handleReset}>Try another PDF</button>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--surface-0) 85%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 400;
  }

  .card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 32px 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    max-width: 380px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  }

  .icon {
    color: var(--error);
    opacity: 0.8;
  }

  .message {
    color: var(--text);
    font-size: 14px;
    text-align: center;
    line-height: 1.4;
  }

  .reset-btn {
    margin-top: 4px;
    padding: 9px 18px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease;
  }

  .reset-btn:hover {
    background: var(--hover);
    border-color: var(--accent);
  }
</style>
