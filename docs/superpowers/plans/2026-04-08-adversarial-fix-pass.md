# Fix Plan — PDF Dark Reader adversarial review findings

**Status:** ✅ **COMPLETE** — shipped as `v0.1.1` on 2026-04-08
**Base:** `v0.1.0` (`ff949bf`)
**Head:** `v0.1.1` (`8cce2f8`)
**Total commits:** 16
**Tests:** 46 → 72 passing, 0 type errors, 0 warnings

## Context

I performed an adversarial review of the PDF Dark Reader implementation at commit `ff949bf` (tagged `v0.1.0`). The review surfaced **26 real issues** across the codebase — five of them critical enough to break promised features. Several were introduced by my own patches during the pre-execution review pass; I was less rigorous on the post-patch code than on the original plan.

This plan fixed all of them. The initial scope was 11 commits covering 20 code changes + 6 explicitly-deferred items, but execution revealed additional regressions across five Codex review rounds (4 rounds found bugs, 1 round was clean) plus user-driven visual polish work, expanding the final delivery to **16 commits**.

The goal was to get the reader to a state where the critical user-facing behaviors (theme popover focus, cursor animation, thumbnail rendering, theme state consistency, keyboard shortcut isolation) actually do what the commit messages claimed.

## Reference material

- **Adversarial review transcript**: conversation history, 26 findings organized CRITICAL → LOW
- **Starting state**: `main` at `ff949bf`, tagged `v0.1.0`, 46/46 tests passing
- **Ending state**: `main` at `8cce2f8`, tagged `v0.1.1`, 72/72 tests passing
- **Codex review rounds**: 5 total against `--base origin/main`, findings summarized below
- **Test infrastructure**: vitest + happy-dom + @testing-library/svelte with `vitest-canvas-mock` polyfill and `Element.prototype.animate` stub in `tests/setup.ts`

## Commit history

### Phase 1 — original 11-commit plan (Commits 1–11)

All green. Each commit: `npm test && npm run check` verified before moving on.

#### ✅ Commit 1 — Theme resolver + state desync fix — `43ae663`

**Addressed:** Finding #4 (theme fallback state desync, DRY violation)

**Files modified:**
- `src/lib/doq-bridge.ts` — added `resolveActiveTheme(preferredId: ThemeId): Theme | null` as the single source of truth for the stored → default → first → null fallback chain
- `src/App.svelte` — replaced inline fallback with `resolveActiveTheme(ui.activeThemeId)` + write back via `ui.setActiveThemeId` if resolved to a different ID
- `src/components/PageView.svelte` — same replacement
- `tests/lib/doq-bridge.test.ts` — 3 new tests for `resolveActiveTheme`

**Result:** stored theme IDs now stay in sync with the actually-applied theme. ThemePopover correctly highlights the selected option after a fallback.

#### ✅ Commit 2 — Popover focus bugs — `0a121ba`

**Addressed:** Findings #1 (bind:this inside each), #10 (click-outside doesn't restore focus), #15 (themes captured at script time), #16 (dead tabindex ternary)

**Files modified:** `src/components/ThemePopover.svelte`, `tests/components/ThemePopover.test.ts`

**Key fix:** `bind:this={firstButtonEl}` inside the `{#each}` loop was rebinding on every iteration, leaving the variable pointing to the *last* button. Replaced with `popoverEl.querySelector<HTMLButtonElement>('.pop-theme')?.focus()` inside the auto-focus `$effect`. Also unified close paths, moved `listThemes()` inline in the template, deleted dead `tabindex={i === 0 ? 0 : 0}` ternary.

**Note:** the click-outside focus restoration was later reverted in **Commit 12** per Codex R1 feedback — see below.

#### ✅ Commit 3 — EmptyState cursor fade + keyboard double-fire — `33075b2`

**Addressed:** Findings #2 (cursor animation overrides transition), #8 (double-fire on Enter/Space)

**Files modified:** `src/components/EmptyState.svelte`

**Key fix:** Added `.cursor.gone { animation: none; }` so the blink keyframe animation stops and the opacity transition can actually run. Without this the cursor kept blinking forever. Also deleted the redundant `handleKey` handler that was causing the file picker to fire twice on Enter/Space.

#### ✅ Commit 4 — Thumbnail render conflict + race — `4af3dc2`

**Addressed:** Findings #3 (Svelte-managed + manual DOM in same element), #5 (no render token, race on rapid theme change)

**Files modified:** `src/components/Thumbnail.svelte`, `tests/components/Thumbnail.test.ts` (new)

**Key fix:** Made `.canvas-host` purely JS-managed (no Svelte conditional children), ported the render-token pattern from PageView.

**Post-fix discovery:** This commit introduced an **infinite re-render loop** by reading `renderedCanvas` reactively inside the theme effect's guard — Codex missed it in R1 but the user's diagnostic found 5 render calls per theme change. Fixed in **Commit 12**.

#### ✅ Commit 5 — Global keyboard shortcut guards — `e5de220`

**Addressed:** Findings #6 (shortcuts fire through open popover / focused inputs), #7 (arrow keys don't preventDefault)

**Files modified:** `src/App.svelte`

**Key fix:** Early-return at top of `handleGlobalKey` if the theme popover is open, or if focus is inside an input/textarea/contenteditable. Added `e.preventDefault()` to Arrow Left/Right handlers so they don't fight native horizontal scroll on `.page-view` at high zoom.

**Post-fix discovery:** The "bail if popover open" check could get stuck with a stale `themePopoverOpen` flag. Fixed in **Commit 15** (Codex R4).

#### ✅ Commit 6 — PDFDocumentProxy cleanup — `ba51ee2`

**Addressed:** Finding #9 (worker resource leak)

**Files modified:** `src/lib/stores/pdf.svelte.ts`, `tests/stores/pdf.test.ts`

**Key fix:** `setDocument` and `reset` now call `this.doc.destroy()` on the previous document before overwriting, releasing worker-side resources. Used optional chaining (`destroy?.()`) to tolerate test doubles.

**Post-fix discovery:** `void destroy()` dropped rejections from cancelled render tasks, surfacing as `unhandledrejection`. Fixed in **Commit 13** (Codex R2).

#### ✅ Commit 7 — PageView DPR reactivity + aria-live scoping — `3b469b2`

**Addressed:** Findings #11 (DPR not reactive), #17 (aria-live announces canvas swaps)

**Files modified:** `src/components/PageView.svelte`

**Key fix:** Added reactive `currentDpr` state updated via `window.resize` + `matchMedia('(resolution: ...)'` change listeners. Moved `aria-live="polite"` off the `.page-view` parent onto the sr-only status span so only "Page X of Y" changes announce.

#### ✅ Commit 8 — Drag counter + pill throttle — `eb595ee`

**Addressed:** Findings #12 (flaky drag-leave), #14 (mousemove thrashing)

**Files modified:** `src/App.svelte`

**Key fix:** Replaced the `relatedTarget === null` drag-leave check with a `dragEnterDepth` counter pattern. `bumpPillVisibility` now early-returns when the pill is already visible and a hide timer is already queued, avoiding reactive store mutations on every mousemove event.

#### ✅ Commit 9 — ZOOM_LEVELS hardening — `52c56b2`

**Addressed:** Finding #13 (mutable export, fragile indexOf)

**Files modified:** `src/lib/stores/ui.svelte.ts`

**Key fix:** Added `as const` to `ZOOM_LEVELS` (readonly at the type level) and a runtime assertion that throws at module load if `DEFAULT_ZOOM_INDEX < 0`.

#### ✅ Commit 10 — UX polish — `d349291`

**Addressed:** Findings #21 (parallel file loads), #22 (ErrorOverlay doesn't close on Escape)

**Files modified:** `src/App.svelte`, `src/components/ErrorOverlay.svelte`, `tests/components/ErrorOverlay.test.ts`

**Key fix:** `handleFile` now early-returns when `loadingState` is `'reading-file'` or `'parsing'`. ErrorOverlay added a window-level Escape handler that called `pdf.reset()`.

**Post-fix discovery:** Two regressions from this commit:
1. ErrorOverlay's Escape stole focus from an open ThemePopover — fixed in **Commit 13** (Codex R2)
2. Esc after a failed *swap* destroyed the working document — fixed in **Commit 14** (Codex R3) via new `pdf.clearError()` method

#### ✅ Commit 11 — Edge-case test coverage — `ed26abb`

**Addressed:** Finding #23 (missing error-path coverage)

**Files modified:** `tests/lib/doq-bridge.test.ts`

**Key fix:** Added 3 edge-case tests — `resolveActiveTheme('')` fallback, `findThemeById` case-sensitivity, `listThemes()` stability across repeated calls.

### Phase 2 — Codex review regressions (Commits 12–15)

Five `/codex:review --base origin/main` rounds were run against the in-progress work. Each round found real regressions until Round 5 came back clean.

#### ✅ Commit 12 — Codex R1 fixes — `d979393`

**Codex findings:**
- **P1** Thumbnail race during the initial render before `renderedCanvas` was set — the guard bailed out of queuing a replacement render
- **P2** ThemePopover click-outside stole focus (routed through `closePopover()` which force-focused the trigger)

**My own discovery during diagnosis:** the Thumbnail's theme effect was creating an **infinite re-render loop** — it read `renderedCanvas` reactively, so every committed canvas re-fired the effect, which called `render()` again, which committed another canvas, etc. The original race test passed by accident (many loop iterations eventually committed a canvas with the right theme).

**Files modified:** `src/components/Thumbnail.svelte`, `src/components/ThemePopover.svelte`, `tests/components/Thumbnail.test.ts`

**Key fixes:**
- Thumbnail: replaced `renderedCanvas !== null` guard with a non-reactive `let renderDispatched = false` flag so committing a canvas does NOT re-fire the effect
- ThemePopover: `handleClickOutside` now calls `ui.setThemePopoverOpen(false)` directly WITHOUT `closePopover()`. Esc still restores focus (keyboard-in → keyboard-out), but pointer-driven dismiss leaves focus where the click placed it.
- New regression test: "theme-change effect does not create an infinite render loop" — asserts call count ≤ 2 after a theme change

#### ✅ Commit 13 — Codex R2 fixes — `a9730f2`

**Codex findings:**
- **P2** `void doc.destroy()` surfaced cancellation rejections as `unhandledrejection` in the browser
- **P2** Double Escape handler: ErrorOverlay + ThemePopover both window-level; if both open simultaneously, pressing Esc dismissed the popover AND destructively reset the document

**Files modified:** `src/lib/stores/pdf.svelte.ts`, `src/components/ErrorOverlay.svelte`, `tests/stores/pdf.test.ts`, `tests/components/ErrorOverlay.test.ts`

**Key fixes:**
- pdf store: capture `destroy()` return value and attach `.catch(() => {})` to swallow cancellation rejections
- ErrorOverlay Esc handler: added `!ui.themePopoverOpen` guard so when both overlays are open the popover's Esc handler wins

#### ✅ Commit 14 — Codex R3 fix — `ef52a3b`

**Codex finding:**
- **P1** After a failed *swap* (user has `paper.pdf` open, tries to swap to `broken.pdf`, load fails), `pdf.loadingState === 'error'` but `pdf.doc` still points at `paperDoc`. Pressing Esc to dismiss the error was calling `pdf.reset()`, which destroyed the working document — destructive for what the user meant as a lightweight dismiss.

**Files modified:** `src/lib/stores/pdf.svelte.ts`, `src/components/ErrorOverlay.svelte`, `tests/stores/pdf.test.ts`, `tests/components/ErrorOverlay.test.ts`

**Key fix:** Added `pdf.clearError()` method that only resets `loadingState` + `errorMessage`, leaving `doc`/`numPages`/`currentPage`/`filename` intact. Returns to `'ready'` if a doc is loaded, `'idle'` if not. ErrorOverlay Esc now calls `clearError()` instead of `reset()`. "Try another PDF" button still calls `reset()` because that's an explicit destructive action.

#### ✅ Commit 15 — Codex R4 fix — `dc431e4`

**Codex finding:**
- **P2** `themePopoverOpen` flag could go stale across unmount/remount cycles. Reachable path: user opens popover → drops bad PDF → error overlay → clicks "Try another PDF" → `pdf.reset()` unmounts ControlPill without clearing the flag → all global keyboard shortcuts get swallowed in the empty state → next PDF load mounts ControlPill which sees `themePopoverOpen=true` and reopens the popover unexpectedly.

**Files modified:** `src/components/ControlPill.svelte`, `src/App.svelte`, `tests/components/ControlPill.test.ts`

**Key fix:** Two-layer defense:
1. ControlPill's `onDestroy` clears `ui.themePopoverOpen` — the component owns the popover lifecycle, its state should not outlive it
2. App.svelte's keyboard guard ALSO checks `pdf.doc !== null` as belt-and-suspenders so a stale flag can't break empty-state shortcuts

New regression test: "unmounting ControlPill clears themePopoverOpen flag".

#### ✅ Codex R5 — clean, no findings

The 5th review pass against `origin/main` found nothing actionable. All fixes internally consistent.

### Phase 3 — User-driven empty state polish (Commit 16)

#### ✅ Commit 16 — Empty-state polish + sidebar unification — `8cce2f8`

Triggered by user feedback on the empty state: *"Empty state is horrendous. Keep the side bar collapsed but view-able in the empty state. For christ sakes fix the centering, sizing and positioning of those hero elements. Add a gradient black/purple/blue haze to the background of the Hero to add depth."*

Plus two subsequent explicit requirements:
- *"When a user refreshes or visits the page, the side bar is collapsed"*
- *"In any state a user can open or close the sidebar"*

**Files modified:** `src/components/EmptyState.svelte`, `src/components/Sidebar.svelte`, `src/App.svelte`, `src/lib/stores/ui.svelte.ts`, `tests/stores/ui.test.ts`, `tests/components/Sidebar.test.ts`

**Empty-state composition fixes:**
- `.empty` now has `flex: 1` so it fills the horizontal `.app` flex container instead of shrinking to content width (root cause of the left-aligned hero in the screenshot)
- Hero enlarged: 36px font, 560px max-width drop zone, more generous padding
- Fixed "g" descender clipping via `display: inline-block` + `line-height: 1.4` + `padding: 2px 0 10px 0` so `background-clip: text` covers the descender region
- Added radial haze background: `radial-gradient` blue → purple → black for depth
- Drop zone glass-morphic treatment with subtle inner gradient + shadow

**Sidebar behavior:**
- `ui.sidebarCollapsed` now defaults to `true` and is NOT persisted — every page load starts collapsed per explicit user requirement
- `setSidebarCollapsed` no longer calls `writePersisted`
- `reset()` default updated to match
- Sidebar now renders in BOTH empty and reader state branches of App.svelte (conditioned on `!ui.sidebarCollapsed`)
- Sidebar component handles empty state: hides filename row when no doc, shows "No PDF loaded" placeholder instead of empty ThumbnailList

**Tests:**
- `ui.test.ts`: 3 new tests locking in the defaults, non-persistence, and toggle behavior. Removed the old `persists to localStorage` test.
- `Sidebar.test.ts`: `beforeEach` now calls `ui.setSidebarCollapsed(false)` to force-open the sidebar since the default is now collapsed

## Items explicitly NOT fixed (with reasons)

| # | Finding | Reason |
|---|---|---|
| 18 | Mobile touch drag events unreliable | Out of scope per spec §2 "mobile-OPTIMIZED UX is not v1" — the responsive baseline is enough |
| 19 | Memoize `listThemes()` for large theme lists | Premature optimization — we have 12 themes, linear scan is trivially fast |
| 20 | Drop zone styled as drop target but global drop handler catches everywhere | Design choice: the visible box is a hint, not a constraint. Users CAN drop anywhere. Not a bug. |
| 24 | `readPersisted` called at class field init time | Already handles the throw case, current behavior is correct |
| 25 | Test for `$effect` cleanup on EmptyState unmount | Partial coverage via Thumbnail race test (Commit 4); full coverage is low-value |
| 26 | Two ways to close popover with different behavior | Resolved by Commit 2's unified close path (later refined by Commit 12 per Codex R1) |

## Final file coverage

| File | Commits that touched it |
|---|---|
| `src/App.svelte` | 1, 5, 8, 10, 15, 16 |
| `src/lib/doq-bridge.ts` | 1 |
| `src/components/PageView.svelte` | 1, 7 |
| `src/components/ThemePopover.svelte` | 2, 12 |
| `src/components/EmptyState.svelte` | 3, 16 |
| `src/components/Thumbnail.svelte` | 4, 12 |
| `src/lib/stores/pdf.svelte.ts` | 6, 13, 14 |
| `src/lib/stores/ui.svelte.ts` | 9, 16 |
| `src/components/ErrorOverlay.svelte` | 10, 13, 14 |
| `src/components/ControlPill.svelte` | 15 |
| `src/components/Sidebar.svelte` | 16 |

## Final verification

| Check | Target | Result |
|---|---|---|
| `npm test` | 46+ green | **72 passing** across 14 files |
| `npm run check` | 0 errors | 0 errors, 0 warnings |
| `npm run build` | < 500 KB main bundle gzipped | ~135 KB gzipped (unchanged from v0.1.0) |
| Codex reviews | clean final round | Round 5 returned no findings |
| Empty state centering | hero centered, box 560px wide, haze visible | Verified via DOM measurements in browser |
| "g" descender clipping | no clipping | Verified: 50.4px line-height + 10px padding-bottom = sufficient mask region |
| Sidebar collapsed on refresh | `localStorage` has no `sidebarCollapsed` key | Verified: `localStorageValue: null` after toggle + reload |
| Sidebar toggle in empty state | chevron opens sidebar, collapse chevron closes it | Verified via JS `querySelector` checks |

**Deferred manual verification** (requires dropping a real PDF, not possible from headless browser automation):
- Theme popover keyboard focus landing on first theme
- Thumbnail race fix with rapid theme changes on a real ~32-page PDF
- Pill auto-hide after 2.5s idle feel
- Failed-swap Esc keeping working doc loaded
- PDF.js worker memory stability over many document loads

The 72-test suite covers the logic paths for all of these; the manual checks are sanity-checks on visual/feel behaviors that unit tests physically cannot exercise.

## Open questions — answered at ship time

1. **Push to origin after all commits?** → **Done.** Pushed 16 commits in one `git push origin main` after Commit 16 + final test run.
2. **Tag `v0.1.1`?** → **Done.** Annotated tag with release notes summarizing all fixes, pushed to origin.
3. **Anything in "NOT changing" list fixed after all?** → No — all 6 remained deferred per original reasoning.

## Lessons from this pass

1. **I was not rigorous about the post-patch code.** My pre-execution adversarial review caught 14 issues in the plan, but I introduced 4+ new bugs in the fixes themselves (Commits 4, 10 in particular). The patches need as much scrutiny as the original code.
2. **"Test passes" is not the same as "fix works".** The Thumbnail race test passed against Commit 4 only because of the infinite re-render loop eventually committing a correct canvas. A proper adversarial review should assert call counts, not just final state.
3. **Codex's iterative review loop was the tightest safety net.** Each round found bugs at progressively lower severity (P1 → P2 → clean). The cost of one more review round is small and the return is high when active patches are in flight.
4. **Stale UI state across component unmounts is a real hazard in Svelte 5.** Store-owned flags that have lifecycle ties to specific components need `onDestroy` cleanup, not just `onMount` setup.
5. **Browser-level visual details (like descender clipping in `background-clip: text`) aren't testable without a real rendering engine.** happy-dom doesn't run CSS layout. Manual spot-checks with real inspection remain essential for hero/brand surfaces.
