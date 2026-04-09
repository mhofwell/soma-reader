<script lang="ts">
  import { pdf } from '$lib/stores/pdf.svelte';
  import type { LoadingState } from '../types';

  const SHOW_AFTER_MS = 300;
  const stepLabels: Partial<Record<LoadingState, string>> = {
    'reading-file': 'Reading file',
    'parsing': 'Parsing PDF'
  };

  let visible = $state(false);
  let loadingStartedAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    const state = pdf.loadingState;
    const isLoading = state === 'reading-file' || state === 'parsing';
    // Only show the overlay during a SWAP (when there's already a doc behind
    // it). On first load (pdf.doc === null), the EmptyState's in-place
    // loading visuals handle the feedback — no overlay needed.
    const isSwap = pdf.doc !== null;

    if (!isLoading || !isSwap) {
      visible = false;
      loadingStartedAt = null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return;
    }

    // First time we observe loading: anchor the start time. Subsequent state
    // transitions (reading-file -> parsing -> rendering) keep the same anchor,
    // so the 300ms threshold is measured from when loading STARTED, not from
    // the most recent transition.
    if (loadingStartedAt === null) {
      loadingStartedAt = performance.now();
    }

    const elapsed = performance.now() - loadingStartedAt;

    if (elapsed >= SHOW_AFTER_MS) {
      // We're already past the threshold from a previous tick — show immediately
      visible = true;
    } else if (!timer) {
      timer = setTimeout(() => {
        visible = true;
        timer = null;
      }, SHOW_AFTER_MS - elapsed);
    }
  });
</script>

{#if visible}
  <div class="overlay" role="status" aria-live="polite">
    <div class="card">
      <div class="spinner"></div>
      <div class="label">{stepLabels[pdf.loadingState] ?? 'Loading'}…</div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--surface-0) 70%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
  }

  .card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(106, 169, 255, 0.2);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 800ms linear infinite;
  }

  .label {
    color: var(--text-dim);
    font-size: 12px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
