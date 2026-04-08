<script lang="ts">
  import { ui } from '$lib/stores/ui.svelte';
  import { listThemes, findThemeById, setActiveTheme } from '$lib/doq-bridge';
  import type { Theme } from '../types';

  let { triggerRef }: { triggerRef: HTMLButtonElement | null } = $props();

  let popoverEl: HTMLDivElement | null = $state(null);

  function selectTheme(theme: Theme): void {
    ui.setActiveThemeId(theme.id);
    const t = findThemeById(theme.id);
    if (t) setActiveTheme(t);
    closePopover();
  }

  function closePopover(): void {
    ui.setThemePopoverOpen(false);
    // Restore focus to the theme button so keyboard users don't lose context
    if (triggerRef) triggerRef.focus();
  }

  function handleClickOutside(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    // Don't close when clicking the trigger button — its own onclick handles toggling
    if (popoverEl && !popoverEl.contains(target) && target !== triggerRef && !triggerRef?.contains(target)) {
      // Pointer-driven dismissal — close the popover WITHOUT forcing focus
      // back to the trigger button. The user clicked on another element and
      // expects that element to receive focus (e.g., clicking the next-page
      // button should leave the next-page button focused for keyboard follow-up).
      //
      // By contrast, Esc dismissal goes through closePopover() and DOES
      // restore focus to the trigger, because keyboard users dismissing with
      // Esc expect to continue interacting via the keyboard.
      ui.setThemePopoverOpen(false);
    }
  }

  function handleKey(e: KeyboardEvent): void {
    if (!ui.themePopoverOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closePopover();
      return;
    }
    // Basic focus trap: Tab cycles within the popover's focusable elements
    if (e.key === 'Tab' && popoverEl) {
      const focusable = popoverEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  // Auto-focus the FIRST theme button when the popover opens.
  // We query the DOM directly instead of using `bind:this` inside the each
  // loop — Svelte rebinds on every iteration of a keyed each block, leaving
  // the bound variable pointing at the LAST item rendered, not the first.
  $effect(() => {
    if (ui.themePopoverOpen && popoverEl) {
      const first = popoverEl.querySelector<HTMLButtonElement>('.pop-theme');
      first?.focus();
    }
  });
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKey} />

{#if ui.themePopoverOpen}
  <div
    bind:this={popoverEl}
    class="theme-popover"
    role="dialog"
    aria-label="Theme picker"
    aria-modal="false"
  >
    <div class="popover-label" id="theme-popover-label">Theme</div>
    <div class="popover-grid" role="listbox" aria-labelledby="theme-popover-label">
      {#each listThemes() as theme (theme.id)}
        <button
          class="pop-theme"
          class:selected={theme.id === ui.activeThemeId}
          role="option"
          aria-selected={theme.id === ui.activeThemeId}
          onclick={() => selectTheme(theme)}
        >
          <span
            class="swatch"
            style:background="linear-gradient(135deg, {theme.background} 50%, {theme.foreground} 50%)"
          ></span>
          <span class="name">
            <span class="scheme">{theme.schemeName}</span>
            <span class="tone">{theme.toneName}</span>
          </span>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .theme-popover {
    /* Positioned relative to the .theme-anchor in ControlPill */
    position: absolute;
    bottom: calc(100% + 12px);
    right: 0;
    background: rgba(20, 20, 24, 0.96);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
    width: 220px;
    max-height: 360px;
    overflow-y: auto;
    z-index: 200;
  }

  .popover-label {
    color: var(--text-faint);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 8px;
  }

  .popover-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pop-theme {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    color: inherit;
    font-family: inherit;
    text-align: left;
    transition: background 120ms ease, border-color 120ms ease;
  }

  .pop-theme:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .pop-theme.selected {
    background: rgba(106, 169, 255, 0.12);
    border-color: rgba(106, 169, 255, 0.3);
  }

  .swatch {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .name {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .name .scheme {
    color: var(--text);
    font-size: 11px;
    font-weight: 500;
  }

  .name .tone {
    color: var(--text-dim);
    font-size: 10px;
  }
</style>
