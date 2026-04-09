<script lang="ts">
  import { pdf } from '$lib/stores/pdf.svelte';

  let { onFileSelected }: { onFileSelected: (file: File) => void } = $props();

  const TITLE_TEXT = 'Made for night reading.';

  // The empty state IS the loading state on first load — when pdf.doc is
  // still null but the loadingState reflects in-progress work. The hero
  // stays mounted, the moon pulses, a progress bar sweeps along the top,
  // and the subtitle echoes the filename so the user gets confirmation.
  let isLoading = $derived(pdf.isLoading);

  let fileInput: HTMLInputElement;

  function handleClick(): void {
    fileInput.click();
  }

  function handleFileChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) onFileSelected(file);
    target.value = ''; // allow re-selecting the same file
  }

  // Note: we intentionally do NOT add a keydown handler here. Native <button>
  // elements already activate on Enter and Space — adding our own handler
  // would cause the click action to fire twice (once from the keydown
  // handler, once from the browser-synthesized click event).
</script>

<div class="empty">
  <!-- Starfield is on a fixed-size child so .empty's resizes (e.g., when
       the sidebar opens) don't invalidate the rasterized bitmap. The
       transform centers it and creates a GPU compositing layer; the inner
       background is painted once and reused as a texture forever. -->
  <div class="starfield" aria-hidden="true"></div>
  <button
    type="button"
    class="drop-zone"
    class:loading={isLoading}
    onclick={handleClick}
    aria-label="Open a PDF file"
  >
    <div class="progress-bar" aria-hidden="true"></div>
    <img class="hero-logo" src="/soma-logo.png" alt="" aria-hidden="true" />
    <div class="typer-wrap">
      <span class="typer-text" class:is-hidden={isLoading}>{TITLE_TEXT}</span>
      <span class="typer-text" class:is-hidden={!isLoading}>Reading&hellip;</span>
    </div>
    <div class="subtitle">
      {#if isLoading}
        <span class="filename">{pdf.filename || 'Reading'}</span> — reading…
      {:else}
        Drop, click, or press <kbd class="sym">⌘</kbd><kbd>o</kbd> to open a PDF.
      {/if}
    </div>
  </button>

  <input
    bind:this={fileInput}
    type="file"
    accept="application/pdf,.pdf"
    onchange={handleFileChange}
    hidden
  />
</div>

<style>
  .empty {
    /* flex:1 is critical — .app is display:flex (horizontal), so without
       this .empty shrinks to content width and gets left-aligned. With
       flex:1 it fills the full available width and its own align/justify
       centers the drop zone. */
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 48px;
    position: relative;
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    animation: power-up 0.9s ease-out both;
    background: var(--bg);
  }

  .starfield {
    /* Fixed-size, absolutely-positioned, GPU-composited via transform.
       The .empty parent can resize freely (sidebar opens, window resizes,
       etc.) and this child does NOT resize — its rasterized bitmap is
       cached and just re-positioned each frame. will-change forces the
       browser to promote this to its own GPU layer immediately and
       PERSISTENTLY (without will-change, the promotion was sometimes
       being lost when the layout thrashed). */
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2000px;
    height: 1200px;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 0;
    will-change: transform;
    background:
      radial-gradient(circle 2px at 3% 18%, rgba(255,255,255,0.65), transparent 100%),
      radial-gradient(circle 2px at 8% 14%, rgba(255,255,255,0.50), transparent 100%),
      radial-gradient(circle 2px at 14% 4%, rgba(255,255,255,0.45), transparent 100%),
      radial-gradient(circle 2px at 18% 19%, rgba(255,255,255,0.42), transparent 100%),
      radial-gradient(circle 2px at 23% 8%, rgba(255,255,255,0.50), transparent 100%),
      radial-gradient(circle 2.5px at 28% 15%, rgba(232,232,255,0.70), transparent 100%),
      radial-gradient(circle 2px at 35% 22%, rgba(255,255,255,0.60), transparent 100%),
      radial-gradient(circle 2px at 42% 7%, rgba(255,255,255,0.45), transparent 100%),
      radial-gradient(circle 2px at 49% 11%, rgba(232,232,255,0.50), transparent 100%),
      radial-gradient(circle 2px at 56% 18%, rgba(184,148,255,0.60), transparent 100%),
      radial-gradient(circle 2px at 62% 25%, rgba(255,255,255,0.55), transparent 100%),
      radial-gradient(circle 2.5px at 71% 12%, rgba(232,232,255,0.68), transparent 100%),
      radial-gradient(circle 2px at 80% 21%, rgba(255,255,255,0.65), transparent 100%),
      radial-gradient(circle 2px at 89% 5%, rgba(255,255,255,0.55), transparent 100%),
      radial-gradient(circle 2px at 92% 28%, rgba(255,255,255,0.60), transparent 100%),
      radial-gradient(circle 2px at 4% 47%, rgba(255,255,255,0.55), transparent 100%),
      radial-gradient(circle 2px at 7% 39%, rgba(255,255,255,0.45), transparent 100%),
      radial-gradient(circle 2px at 12% 28%, rgba(255,255,255,0.50), transparent 100%),
      radial-gradient(circle 2px at 17% 56%, rgba(184,148,255,0.55), transparent 100%),
      radial-gradient(circle 2.5px at 25% 44%, rgba(184,148,255,0.65), transparent 100%),
      radial-gradient(circle 2px at 31% 33%, rgba(255,255,255,0.65), transparent 100%),
      radial-gradient(circle 2px at 38% 52%, rgba(255,255,255,0.45), transparent 100%),
      radial-gradient(circle 2px at 44% 38%, rgba(255,255,255,0.55), transparent 100%),
      radial-gradient(circle 2px at 46% 57%, rgba(184,148,255,0.60), transparent 100%),
      radial-gradient(circle 2.5px at 64% 41%, rgba(232,232,255,0.62), transparent 100%),
      radial-gradient(circle 2px at 73% 32%, rgba(232,232,255,0.50), transparent 100%),
      radial-gradient(circle 2px at 78% 49%, rgba(255,255,255,0.65), transparent 100%),
      radial-gradient(circle 2px at 88% 36%, rgba(255,255,255,0.50), transparent 100%),
      radial-gradient(circle 2px at 95% 58%, rgba(232,232,255,0.55), transparent 100%),
      radial-gradient(circle 2px at 5% 76%, rgba(255,255,255,0.55), transparent 100%),
      radial-gradient(circle 3px at 9% 64%, rgba(255,255,255,0.78), transparent 100%),
      radial-gradient(circle 2px at 11% 60%, rgba(255,255,255,0.50), transparent 100%),
      radial-gradient(circle 2px at 21% 81%, rgba(255,255,255,0.58), transparent 100%),
      radial-gradient(circle 2px at 27% 71%, rgba(255,255,255,0.48), transparent 100%),
      radial-gradient(circle 2px at 33% 64%, rgba(255,255,255,0.45), transparent 100%),
      radial-gradient(circle 2px at 39% 86%, rgba(255,255,255,0.45), transparent 100%),
      radial-gradient(circle 2px at 47% 96%, rgba(255,255,255,0.50), transparent 100%),
      radial-gradient(circle 2px at 51% 78%, rgba(184,148,255,0.62), transparent 100%),
      radial-gradient(circle 2px at 56% 89%, rgba(232,232,255,0.50), transparent 100%),
      radial-gradient(circle 2px at 58% 47%, rgba(255,255,255,0.55), transparent 100%),
      radial-gradient(circle 2px at 67% 73%, rgba(255,255,255,0.52), transparent 100%),
      radial-gradient(circle 2px at 70% 61%, rgba(255,255,255,0.48), transparent 100%),
      radial-gradient(circle 3px at 73% 92%, rgba(255,255,255,0.75), transparent 100%),
      radial-gradient(circle 2px at 81% 96%, rgba(255,255,255,0.55), transparent 100%),
      radial-gradient(circle 2.5px at 83% 68%, rgba(232,232,255,0.68), transparent 100%),
      radial-gradient(circle 2px at 84% 81%, rgba(255,255,255,0.45), transparent 100%),
      radial-gradient(circle 2px at 91% 88%, rgba(184,148,255,0.55), transparent 100%),
      radial-gradient(circle 2px at 97% 75%, rgba(184,148,255,0.55), transparent 100%),
      radial-gradient(circle 2px at 6% 88%, rgba(255,255,255,0.55), transparent 100%),
      radial-gradient(circle 2.5px at 24% 94%, rgba(232,232,255,0.68), transparent 100%);
  }

  .drop-zone {
    position: relative; /* anchors the absolutely-positioned .hero-logo */
    width: 100%;
    max-width: 840px;
    border: 2px dashed var(--border);
    border-radius: 33px;
    padding: 120px 84px 108px 84px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    /* Layered backgrounds (top → bottom in the stack):
       1. Directional purple/blue radial originating from the logo's position
          in the top-right (88% 18%) and falling off across the box. Reads
          visually as if the moon icon is a small light source illuminating
          the rest of the box.
       2. Glass-morphic linear overlay underneath for the subtle inner sheen. */
    background:
      radial-gradient(
        circle 1000px at 92% 18%,
        rgba(184, 148, 255, 0.20) 0%,
        rgba(142, 115, 240, 0.12) 18%,
        rgba(106, 169, 255, 0.06) 45%,
        rgba(70, 40, 120, 0.03) 70%,
        transparent 90%
      ),
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.025) 0%,
        rgba(255, 255, 255, 0.01) 100%
      );
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    transition: border-color 200ms ease, background 200ms ease, transform 200ms ease;
    box-shadow: 0 36px 96px rgba(0, 0, 0, 0.5);
  }

  .hero-logo {
    position: absolute;
    top: 28px;
    right: 28px;
    width: 68px;
    height: 68px;
    pointer-events: none;
    z-index: 1;
  }

  /* ─── Loading state ────────────────────────────────────────────────
     Triggered by `class:loading` on the drop-zone when pdf.loadingState
     is 'reading-file' or 'parsing'. The hero stays mounted; the moon
     icon pulses, the border-color shifts to accent, the progress bar
     sweeps across the top edge, and the subtitle echoes the filename. */

  .progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-top-left-radius: 33px;
    border-top-right-radius: 33px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    z-index: 2;
    transition: opacity 200ms ease;
  }

  .progress-bar::before {
    content: '';
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 35%;
    height: 100%;
    /* Pure purple sweep — no blue. The light end is a soft lavender, the
       core is the full --accent-2 wordmark color. */
    background: linear-gradient(
      90deg,
      transparent,
      rgba(184, 148, 255, 0.55) 30%,
      var(--accent-2) 50%,
      rgba(184, 148, 255, 0.55) 70%,
      transparent
    );
    transform: translateX(-100%);
  }

  .drop-zone.loading .progress-bar {
    opacity: 1;
  }

  .drop-zone.loading .progress-bar::before {
    animation: progress-sweep 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes progress-sweep {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }

  .drop-zone.loading {
    border-color: var(--accent-2);
  }

  .drop-zone.loading .hero-logo {
    animation: moon-glow-pulse 1.8s ease-in-out infinite;
  }

  /* "Glow intensifies" — the moon picks up a purple drop-shadow that
     breathes in and out on a slow sine, like the moon is thinking. The
     scale pulse is very subtle (1 → 1.04) so the eye reads it as glow,
     not as the icon physically growing. */
  @keyframes moon-glow-pulse {
    0%, 100% {
      transform: scale(1);
      filter: drop-shadow(0 0 16px rgba(184, 148, 255, 0.45));
    }
    50% {
      transform: scale(1.04);
      filter: drop-shadow(0 0 36px rgba(184, 148, 255, 0.85));
    }
  }

  .subtitle .filename {
    color: var(--text);
    font-weight: 500;
  }

  .drop-zone:hover,
  .drop-zone:focus-visible {
    /* Hover state in the hero's purple register, not the app accent blue —
       this surface's identity is the white→purple wordmark gradient. */
    border-color: var(--accent-2);
    background: rgba(184, 148, 255, 0.05);
    outline: none;
    transform: translateY(-2px);
  }

  .typer-wrap {
    /* Grid stack: both .typer-text spans share the SAME grid cell, so the
       default and loading title overlap perfectly with no layout shift
       during the crossfade. The cell sizes to the larger of the two texts
       ("Made for night reading."), so "Reading…" sits centered inside the
       wider area. min-height guards against font-swap jitter. */
    min-height: 80px;
    display: grid;
    grid-template-areas: "stack";
    place-items: center;
    overflow: visible;
  }

  .typer-text {
    grid-area: stack;
    /* display: inline-block gives the element a real box model so
       background-clip:text paints across the full padded area including
       the descender region. Plain inline spans clip the background to
       the em-square of each glyph, which cuts off "g" / "y" / "p" tails. */
    display: inline-block;
    font-size: 54px;
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.4;
    padding: 3px 0 15px 0;
    background: linear-gradient(135deg, #f5f5fa 20%, var(--accent-2) 80%);
    background-size: 810px 100%;
    background-repeat: no-repeat;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: pre;
    transition: opacity 320ms ease;
  }

  .typer-text.is-hidden {
    opacity: 0;
    pointer-events: none;
  }

  @keyframes power-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .subtitle {
    color: var(--text-dim);
    font-size: 16px;
    text-align: center;
    letter-spacing: -0.005em;
  }

  .subtitle kbd {
    /* Mac-style keycap: subtle 3D button with a top→bottom highlight, dark
       inset shadow at the bottom edge to suggest the cap's curvature, and
     a 1px outset shadow underneath. */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    margin: 0 1px;
    color: var(--text);
    font-family: -apple-system, "SF Mono", monospace;
    font-size: 13px;
    font-weight: 500;
    line-height: 1;
    vertical-align: middle;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.02) 100%
    );
    border: 1px solid var(--border);
    border-radius: 5px;
    box-shadow:
      inset 0 -1px 0 rgba(0, 0, 0, 0.5),
      0 1px 2px rgba(0, 0, 0, 0.35);
  }

  .subtitle kbd.sym {
    padding-top: 1px;
  }
</style>
