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
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 18px;
    padding: 32px;
  }

  .drop-zone {
    width: 80%;
    max-width: 460px;
    border: 2px dashed var(--border);
    border-radius: 18px;
    padding: 50px 36px 44px 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255, 255, 255, 0.015);
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    transition: border-color 200ms ease, background 200ms ease;
  }

  .drop-zone:hover,
  .drop-zone:focus-visible {
    border-color: var(--accent);
    background: rgba(106, 169, 255, 0.04);
    outline: none;
  }

  .typer-wrap {
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .typer-text {
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 1;
    background: linear-gradient(135deg, #f0f0f4 30%, var(--accent-2));
    background-size: 360px 100%;
    background-repeat: no-repeat;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: pre;
  }

  .cursor {
    display: inline-block;
    width: 2px;
    height: 22px;
    background: var(--accent-2);
    margin-left: 3px;
    vertical-align: middle;
    transform: translateY(-2px);
    border-radius: 1px;
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
    margin-top: 18px;
    width: 22px;
    height: 22px;
    color: var(--accent);
    opacity: 0.7;
  }

  .subtitle {
    color: var(--text-dim);
    font-size: 13px;
    text-align: center;
    letter-spacing: -0.005em;
  }

  .subtitle .meta {
    display: block;
    color: var(--text-faint);
    font-size: 11px;
    margin-top: 4px;
  }

  .subtitle kbd {
    color: var(--text-dim);
    font-family: -apple-system, "SF Mono", monospace;
    font-size: 11px;
    font-weight: 500;
  }
</style>
