<script lang="ts">
  let { onFileSelected }: { onFileSelected: (file: File) => void } = $props();

  const TARGET_TEXT = 'Made for night reading.';
  const TYPE_INTERVAL_MS = 55;
  const CURSOR_FADE_DELAY_MS = 1500;

  let displayedText = $state('');
  let cursorVisible = $state(true);
  let fileInput: HTMLInputElement;

  $effect(() => {
    let charIdx = 0;
    let typeTimer: ReturnType<typeof setTimeout>;
    let fadeTimer: ReturnType<typeof setTimeout>;

    function type() {
      charIdx++;
      displayedText = TARGET_TEXT.slice(0, charIdx);
      if (charIdx < TARGET_TEXT.length) {
        typeTimer = setTimeout(type, TYPE_INTERVAL_MS);
      } else {
        fadeTimer = setTimeout(() => {
          cursorVisible = false;
        }, CURSOR_FADE_DELAY_MS);
      }
    }

    typeTimer = setTimeout(type, 200);

    return () => {
      clearTimeout(typeTimer);
      clearTimeout(fadeTimer);
    };
  });

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
  <button
    type="button"
    class="drop-zone"
    onclick={handleClick}
    aria-label="Open a PDF file"
  >
    <div class="typer-wrap">
      <span class="typer-text">{displayedText}</span><span
        class="cursor"
        class:gone={!cursorVisible}
      ></span>
    </div>
    <svg
      class="icon-moon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  </button>

  <div class="subtitle">
    Drop in a PDF to start.
    <span class="meta">or press <kbd>⌘O</kbd></span>
  </div>

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
    gap: 28px;
    padding: 48px;
    position: relative;
    /* Ambient haze — black → deep blue → deep purple radial gradient centered
       on the hero. Gives the composition depth so the dashed box doesn't
       float in a void. Subtle — the darks still dominate. */
    background:
      radial-gradient(
        ellipse 1100px 750px at 50% 50%,
        rgba(106, 169, 255, 0.09) 0%,
        rgba(142, 115, 240, 0.07) 25%,
        rgba(70, 40, 120, 0.05) 50%,
        rgba(15, 15, 30, 0.02) 75%,
        transparent 100%
      );
  }

  .drop-zone {
    width: 100%;
    max-width: 560px;
    border: 2px dashed var(--border);
    border-radius: 22px;
    padding: 80px 56px 72px 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* Glass-morphic background with a subtle inner gradient tint */
    background:
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.025) 0%,
        rgba(255, 255, 255, 0.01) 100%
      );
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    transition: border-color 200ms ease, background 200ms ease, transform 200ms ease;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  }

  .drop-zone:hover,
  .drop-zone:focus-visible {
    border-color: var(--accent);
    background: rgba(106, 169, 255, 0.05);
    outline: none;
    transform: translateY(-2px);
  }

  .typer-wrap {
    /* min-height (not fixed height) so the wrap can grow if the text
       ever wraps, but doesn't jitter as characters type in. */
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }

  .typer-text {
    /* display: inline-block gives the element a real box model so
       background-clip:text paints across the full padded area including
       the descender region. Plain inline spans clip the background to
       the em-square of each glyph, which cuts off "g" / "y" / "p" tails. */
    display: inline-block;
    font-size: 36px;
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.4;
    padding: 2px 0 10px 0;
    background: linear-gradient(135deg, #f5f5fa 20%, var(--accent-2) 80%);
    background-size: 540px 100%;
    background-repeat: no-repeat;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: pre;
  }

  .cursor {
    display: inline-block;
    width: 3px;
    height: 36px;
    background: var(--accent-2);
    margin-left: 4px;
    vertical-align: middle;
    transform: translateY(-5px);
    border-radius: 1.5px;
    animation: blink 1.05s steps(1, end) infinite;
    transition: opacity 800ms ease 1500ms;
  }

  .cursor.gone {
    /* Stop the blink animation so the opacity transition can actually run.
       Without `animation: none`, the keyframes keep rewriting `opacity` on
       every frame and the transition never wins — the cursor just keeps
       blinking instead of fading out. */
    animation: none;
    opacity: 0;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  .icon-moon {
    margin-top: 28px;
    width: 28px;
    height: 28px;
    color: var(--accent);
    opacity: 0.75;
  }

  .subtitle {
    color: var(--text-dim);
    font-size: 14px;
    text-align: center;
    letter-spacing: -0.005em;
  }

  .subtitle .meta {
    display: block;
    color: var(--text-faint);
    font-size: 12px;
    margin-top: 6px;
  }

  .subtitle kbd {
    color: var(--text-dim);
    font-family: -apple-system, "SF Mono", monospace;
    font-size: 12px;
    font-weight: 500;
  }
</style>
