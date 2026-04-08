# PDF Dark Reader — Design Document

**Date:** 2026-04-07
**Status:** Draft for review
**Codename:** PDF Dark (working title)

## 1. Overview

A web application that lets anyone drop a PDF and read it in genuinely good dark mode. Zero login. Zero upload. Everything happens in the user's browser.

The differentiator is **dark mode quality**. Most "PDF dark mode" tools (browser extensions, CSS filter hacks) destroy image colors and produce muddy, low-contrast output. We use a perceptually-uniform CIELAB color transformation that preserves image content and produces text that is genuinely pleasant to read at night.

**Tagline:** *Made for night reading.*

**Project guiding principle:** *Do one thing really, really well — PDF dark mode reading.*

## 2. Goals and non-goals

### Goals (v1)

- Drop a PDF, see it rendered in beautiful dark mode within ~1 second.
- Zero backend, zero account, zero data leaving the user's device.
- Smooth page navigation via thumbnail sidebar and floating control pill.
- Multiple curated dark themes (e.g., Firefox Dark, Nord Polar Night, Solarized Dark, Safari Night).
- Elegant, minimalist UI that gets out of the way of reading.
- Crisp rendering on high-DPI displays.
- **Baseline accessibility:** keyboard navigable throughout, focus trap and focus restoration in the theme popover, ARIA labels on all interactive elements, `aria-live` page-change announcements, screen-reader-friendly empty state.
- **Responsive baseline (not optimized):** layout doesn't break at narrow viewports. The sidebar becomes a drawer overlay on screens under 720 px wide instead of eating half the screen as a fixed column.

### Non-goals (v1)

The following are deferred to v1.5 or later, on purpose:

- Search within PDFs (would require text layer integration; planned for v1.5)
- Text selection / copy (will fall out of the v1.5 text-layer work)
- Mobile-OPTIMIZED UX — touch-first interactions, gesture handling, mobile-specific UI patterns. The responsive baseline (Goals §2) ensures the layout doesn't break at narrow viewports; that is the *only* mobile concession in v1.
- Annotations, highlights, bookmarks, saved library
- Multiple PDFs open simultaneously
- Print
- Light mode toggle (this is *a dark mode reader* — light mode would be a different product)
- OCR for scanned PDFs
- Cloud sync, accounts, history

## 3. Architecture

### 3.1 High level

```
                  ┌──────────────────────────────────┐
                  │           Browser tab            │
                  │                                  │
   user drops ──▶ │  ┌──────────┐    ┌───────────┐  │
   a .pdf file    │  │ Svelte 5 │───▶│ pdfjs-    │  │
                  │  │   UI     │    │ dist (WW) │  │
                  │  └──────────┘    └───────────┘  │
                  │        │              │         │
                  │        ▼              ▼         │
                  │  ┌──────────────────────────┐  │
                  │  │ CanvasRenderingContext2D │  │
                  │  │  (patched globally by    │  │
                  │  │       vendored doq)      │  │
                  │  └──────────────────────────┘  │
                  │              │                  │
                  │              ▼                  │
                  │       <canvas> elements         │
                  └──────────────────────────────────┘
```

100% client-side. No server. No upload. The PDF byte buffer never leaves the browser tab.

### 3.2 Why client-side

We validated three things in Phase 1 and Phase 2 that locked this in:

1. **PDF.js's `pageColors` API is fatally limited** for our quality goal — when enabled, it converts all images in the PDF to black and white. Documented in [mozilla/pdf.js#17826](https://github.com/mozilla/pdf.js/issues/17826).
2. **CSS-filter approaches** (`invert + hue-rotate`) destroy photo colors and look muddy. This is what every cheap "PDF dark mode" tool uses.
3. **doq solves both problems** by hooking into the canvas rendering layer with CIELAB color transformation. It preserves image colors via composite-operation tricks and produces perceptually-uniform results.

A client-side architecture lets us use doq directly without infrastructure cost or storage policy concerns. Privacy is preserved as a side effect of having no backend at all.

### 3.3 Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Svelte 5** | Small runtime, state-driven UI fits perfectly, built-in `transition:` directives match our pill auto-hide / sidebar collapse / popover needs |
| Build tool | **Vite** | Standard, fast, zero-config ES module dev server |
| PDF rendering | **`pdfjs-dist`** (npm) | Mozilla's library, mature, the only real option |
| Dark mode rendering | **Vendored doq** (MIT, [github.com/shivaprsd/doq](https://github.com/shivaprsd/doq)) | Files copied into `src/lib/doq/`. No NPM package exists. ~22 KB total. We track upstream for fixes. |
| Hosting | **Static** (Cloudflare Pages, Vercel, or Netlify — TBD) | The whole app is static assets. Pick whichever you prefer for CI/CD. |
| Language | **TypeScript** | Standard for Svelte 5 projects, catches doq API mistakes early |

## 4. UX and layout

### 4.1 Layout shape (locked)

Hybrid: Option C (sidebar-centric, no top chrome) with the floating control pill from Option A.

```
┌────────────┬─────────────────────────────────────┐
│            │                                     │
│ App Logo   │                                     │
│ Filename   │                                     │
│            │                                     │
│ ── Pages ─ │           page renders              │
│ ┌──────┐   │            here, in                 │
│ │      │   │            dark mode                │
│ ├──────┤   │                                     │
│ │ ◄ 4  │   │                                     │
│ ├──────┤   │                                     │
│ │      │   │                                     │
│ │      │   │                                     │
│ │      │   │      ┌────────────────────┐         │
│ │      │   │      │ ‹ 4/32 › │ − 100% +│ │ 🎨  │ │
│ │      │   │      └────────────────────┘         │
│ └──────┘   │                                     │
└────────────┴─────────────────────────────────────┘
```

- **Left sidebar (200 px):** app identity (logo + name), current filename + small swap-file icon, virtualized thumbnail list
- **Main area:** the PDF page render fills the available space, vertically and horizontally centered, with horizontal scroll if it exceeds the viewport at higher zoom
- **Floating control pill** (bottom center): glass-morphic translucent rounded rectangle containing page nav, zoom, and a theme button that opens a popover

### 4.2 Empty state

When no PDF is loaded, the **sidebar is hidden entirely** — there is nothing to navigate, so showing chrome would be noise. The main area takes the full window width and centers a dashed-border drop zone containing:

1. **Headline** (typewriter animation, single play on first paint, ~1.3 s):
   *"Made for night reading."*
   Gradient fill: white→purple (linear-gradient 135°). Cursor (2 px purple bar) blinks during typing, fades out 1.5 s after the period.
2. **Crescent moon icon** (subtle, 22 px, blue, 70% opacity)

Below the drop zone, on its own line:

3. **Subtitle:** *"Drop in a PDF to start."* (13 px, dim gray)
4. **Shortcut meta:** *"or press ⌘O"* (11 px, even dimmer)

The dashed box itself is the click target — clicking anywhere in it opens the system file picker.

**Sidebar behavior on first PDF load:** Once a PDF is parsed and ready, the sidebar slides in from the left automatically (it now has thumbnails to show). From that point on, the user controls collapse/expand state via `⌘\` or the sidebar's chevron toggle, persisted to `localStorage`.

### 4.3 Reading state

Once a PDF is loaded:

- **Thumbnails** populate the sidebar lazily. Each thumb is a low-resolution dark-mode render of its page. The current page has a blue highlight border. Clicking jumps to that page.
- **Floating pill** slides up from below and stays visible. Auto-hides after 2.5 s of mouse inactivity, fades back in instantly on movement.
- **Theme popover** opens above the pill when the theme button is clicked. Click a theme to apply instantly. Click outside or press Esc to dismiss. The button highlights blue while open.
- **Sidebar collapse:** `⌘\` (or `Ctrl+\`) toggles the sidebar fully closed. State remembered in `localStorage`. A tiny chevron at the sidebar's right edge serves as the visible toggle. (Note: in the empty state, the sidebar is hidden entirely regardless of this state — see §4.2.)
- **Drop a new file:** at any time, the user can drag a new PDF onto the window, click the swap icon in the sidebar header, or press `⌘O`.

### 4.4 Loading state

Document parsing is the slowest step (~700 ms for a 32-page arXiv paper, validated in Phase 2). Above ~300 ms we need a visible loading affordance.

- A subtle progress overlay appears in the main area
- The sidebar shows a skeleton thumbnail list (greyed boxes)
- Once the first page is rendered, the loading state is replaced by the reading state

Specific visual treatment of the loading state is **not** locked — to be designed during build.

### 4.5 Drag-over state

When the user drags a file over the window, the dashed drop zone gains a subtle highlight (border color shifts to blue, slight glow). Specific visual is **not** locked.

### 4.6 Default zoom

`100%` corresponds to **internal scale 1.5×**, not raw PDF coordinates (which would be tiny at typical screen DPI). This matches Adobe's "actual size" convention. Zoom levels: `50%, 75%, 100%, 125%, 150%, 200%, 250%, 300%`. Click the percentage label in the pill to snap back to 100%.

### 4.7 Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘O` / `Ctrl+O` | Open file picker |
| `⌘\` / `Ctrl+\` | Toggle sidebar collapse |
| `←` / `→` | Previous / next page |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom to 100% |
| `Esc` | Dismiss theme popover |

## 5. Component breakdown

A small Svelte component tree, kept deliberately flat:

```
src/
├── App.svelte                  # top-level shell, routes between empty and reader states
├── lib/
│   ├── doq/                    # vendored doq (engine.js, color.js, api.js, colors.json, etc.)
│   ├── stores/
│   │   ├── pdf.svelte.ts       # current PDF document, page count, current page
│   │   ├── ui.svelte.ts        # sidebar collapsed, pill visible, zoom level, theme
│   │   └── persist.svelte.ts   # localStorage helpers for ui state
│   ├── pdf/
│   │   ├── loader.ts           # file → ArrayBuffer → pdfjs document
│   │   ├── renderer.ts         # render a page to a canvas with optional doq dark mode
│   │   └── thumbnail.ts        # render a low-res thumbnail
│   └── doq-bridge.ts           # init doq, set theme, enable/disable, theme list
├── components/
│   ├── EmptyState.svelte       # dashed box with typewriter title, hint, file picker
│   ├── Sidebar.svelte          # app header, swap file, thumbnail list
│   ├── ThumbnailList.svelte    # virtualized list of page thumbnails
│   ├── PageView.svelte         # canvas renderer for current page with auto re-render on zoom/theme/page
│   ├── ControlPill.svelte      # floating pill with page nav, zoom, theme button
│   ├── ThemePopover.svelte     # popover with theme swatches
│   ├── LoadingState.svelte     # skeleton + progress (TBD visual)
│   └── DragOverlay.svelte      # global drag-over highlight
└── main.ts                     # Vite entry point
```

Each component has one job. Stores hold all shared state. Side-effecting modules (`loader`, `renderer`, `doq-bridge`) are functions, not classes.

## 6. State and data flow

### 6.1 State

Three Svelte 5 runes-based stores:

- **`pdf`** — current `pdfjs.PDFDocumentProxy`, `numPages`, `currentPage`, `filename`, `loadingState` (`'idle' | 'reading-file' | 'parsing' | 'rendering' | 'ready' | 'error'`), `errorMessage`
- **`ui`** — `sidebarCollapsed`, `pillVisible`, `zoomLevel`, `currentTheme`, `themePopoverOpen`
- **`persist`** — wraps `localStorage` for `sidebarCollapsed` and `currentTheme`

### 6.2 Drop-to-render flow

```
1. User drops file (or clicks / picks via ⌘O)
2. file.arrayBuffer() ────────────────────── ~5 ms
3. pdfjsLib.getDocument(buffer)              ~700 ms (32-page paper)
4. UI shows loading state if elapsed > 300 ms
5. pdf.set({ doc, numPages, currentPage: 1 })
6. Sidebar lazily renders thumbnails (background, low priority)
7. PageView renders current page canvas:
   a. doq.setTheme([schemeIdx, toneIdx])     instant
   b. Get viewport at currentScale × dpr
   c. page.render({ canvasContext, viewport, transform: [dpr, 0, 0, dpr, 0, 0] })
   d. Display canvas at CSS size = viewport size
   e. ~30-60 ms steady state on a modern desktop
8. Reading state visible
```

### 6.3 Page change flow

When the user navigates to a different page:
1. `pdf.currentPage` updates
2. `PageView` reactively re-renders the canvas
3. `Sidebar` highlights the new current thumbnail

### 6.4 Theme change flow

When the user picks a new theme in the popover:
1. `ui.currentTheme` updates → persisted to localStorage
2. `doq.setTheme([sIdx, tIdx])` is called
3. `PageView` reactively re-renders the canvas with the new colors
4. Visible thumbnails are invalidated and lazily re-rendered

## 7. doq integration details

### 7.1 Vendoring

Since doq has no NPM package ([shivaprsd/doq#6](https://github.com/shivaprsd/doq/issues/6)), we copy `lib/*.js` and `lib/colors.json` from upstream into `src/lib/doq/`. Files: `engine.js` (7.3 KB), `color.js` (7.3 KB), `api.js` (2.3 KB), `colors.json` (~2 KB), `annots.js` (2.7 KB), `doq.js` (53 B), `utils.js` (487 B), plus `LICENSE.txt`. Total: ~22 KB.

We track upstream for bug fixes. We do not modify the vendored files; if we need to extend behavior, we do it in `src/lib/doq-bridge.ts`.

### 7.2 How doq works (precise summary)

- Calling `doq.init()` patches `CanvasRenderingContext2D.prototype` globally. Wrapped methods: `fill`, `fillRect`, `fillText`, `stroke`, `strokeRect`, `strokeText`, `drawImage`, plus the `fillStyle` and `strokeStyle` setters via property descriptors.
- Each wrapped method checks `DOQ.flags.engineOn`. When `false`, the original method runs unchanged. When `true`, colors flow through `getCanvasStyle()` → `Color` (CIELAB) → cached transformed value → original method.
- Image draws are intercepted by `setCanvasCompOp`, which uses a `destination-in` composite operation on a temporary canvas to apply a tint without destroying image content.
- Cache lives in two `Map`s and a `WeakMap`. Cleared on theme change.

### 7.3 The bug we worked around in Phase 2

doq's `setTheme()` accepts a string (`"Solarized Dark"`) or an array (`[sIdx, tIdx]`). The string parser splits on whitespace and treats only the first two tokens as scheme + tone, so multi-word tones like *"Polar Night"* fail (it looks for tone `"Polar"`, throws). **Always pass numeric indices via the array form.**

Our `doq-bridge.ts` exposes `setTheme(schemeName: string, toneName: string)` and converts to indices internally to hide this from the rest of the app.

### 7.4 doq + text selection (future)

When we add text selection in v1.5, we'll add PDF.js's HTML text layer on top of the canvas. doq does not affect HTML — we'll need a small CSS module for the text layer in dark mode (transparent text + theme-colored highlight backgrounds).

## 8. Performance

### 8.1 Measured baseline (Phase 2)

From the prototype, on a 32-page arXiv paper (2.98 MB), modern desktop hardware:

| Metric | Measured | Acceptable? |
|---|---|---|
| File → ArrayBuffer | ~5 ms | Trivial |
| `getDocument()` parse | ~720 ms | Yes; needs loading state |
| Light page render | 8–60 ms | Yes |
| Dark page render | 25–62 ms | Yes |
| Time to first visible page | ~760 ms | Yes; loading state covers it |

### 8.2 Targets

| Metric | Target | Notes |
|---|---|---|
| Time-to-first-visible-page (typical PDF, < 5 MB) | < 1 s | Loading spinner above 300 ms |
| Time-to-first-visible-page (large PDF, 50 MB) | < 3 s | Acceptable with progress feedback |
| Dark render overhead vs baseline | < 50% steady-state | Cache makes this realistic |
| Sidebar thumbnail rendering | Lazy, never blocks main thread | Use `requestIdleCallback` or worker |
| Scroll FPS | 60 FPS | Will need to verify during build |

### 8.3 What we're explicitly NOT optimizing for in v1

- Files > 200 MB (would require streaming, very rare in practice)
- Mobile browsers (responsive but not perf-tuned)
- Older / low-end hardware (we target ~2020+ desktop CPUs and modern Chromium / Firefox / Safari)

## 9. Error handling

| Failure | Behavior |
|---|---|
| Non-PDF file dropped | Toast error: "That's not a PDF. Try again." |
| Corrupt PDF (PDF.js throws on parse) | Inline error in main area: "Couldn't read this PDF — it might be damaged." Empty state remains, user can drop another file. |
| Encrypted PDF (password-protected) | Inline error: "This PDF is password-protected. Decrypt it before opening." (We don't prompt for passwords in v1 — out of scope.) |
| Scanned/image-only PDF | Renders fine (it's just images) but text selection (v1.5) will be unavailable. Show no special message. |
| File > 200 MB | Warn before loading: "Large PDFs may cause your browser to slow down. Continue?" |
| doq init failure | Log error, fall back to light rendering with a small toast. The reader still works, just without dark mode. |
| Render failure on a single page | Show a placeholder ("This page failed to render") and continue. Don't break navigation. |

## 10. Browser compatibility

| Browser | Support |
|---|---|
| Chromium (Chrome, Edge, Brave, Arc) ≥ recent | Full support |
| Firefox ≥ recent | Full support |
| Safari ≥ recent | Full support |
| Mobile Safari / Chrome Android | Functional, not optimized |
| Internet Explorer | No |

We require: ES modules with import maps support, `Promise`, `fetch`, `CanvasRenderingContext2D`, `IntersectionObserver`, `localStorage`, drag-and-drop API. All standard in browsers from 2022 onward.

## 11. Sample PDFs

We bundle 3 small public-domain test PDFs (~1–3 MB total) that the user can use to verify the build during development. The earlier "try a sample" UI was deferred — the bundled files are dev/test only, not user-facing in v1.

## 12. Hosting and deployment

The entire app is a static SPA. Build via `vite build`, deploy to:
- **Cloudflare Pages** (recommended — generous free tier, fast CDN, easy custom domain), OR
- **Vercel** or **Netlify** (also fine)

**Decision deferred** to a separate issue. None of these affect the design.

## 13. Open questions (deferred decisions)

These aren't blockers for the spec. They'll get answered during build:

1. Loading state visual treatment — skeleton, progress bar, both?
2. Drag-over visual treatment — border highlight, full-window overlay, what?
3. Toast / error message component design
4. Specific color values for the brand gradient (white→purple) — current values are placeholder
5. Final logo / favicon
6. Hosting provider choice
7. Which 3 sample PDFs to bundle for development testing

## 14. Phase references

- **Phase 1** (research): documented in this brainstorm session. Validated PDF.js API limits, found doq, reviewed source.
- **Phase 2** (prototype): see `prototype/index.html` and `prototype/doq/`. Validated:
  - pdfjs-dist + doq integration works with no PDF.js modifications
  - Real timing numbers (cited above in §8.1)
  - Visual quality on a real arXiv paper
  - Multi-word tone bug in doq (worked around with numeric indices)

The prototype is **throwaway** — it lives in `prototype/` for reference and gets removed once the real implementation lands.

## 15. Attribution and licensing

- **doq** (MIT, © shivaprsd): vendored in `src/lib/doq/`. License preserved in `src/lib/doq/LICENSE.txt`. Credit in app About screen and README.
- **pdfjs-dist** (Apache 2.0, © Mozilla): consumed via npm.
- **App code:** MIT (or your preference — to be decided).

## 16. v1 success criteria

This v1 is a success if:

1. A user can drop a PDF and have it rendered in beautiful dark mode in under 1 second for typical files
2. The dark mode looks visibly better than every CSS-filter-based PDF dark mode tool (validated by side-by-side comparison)
3. The reader UI is calm, elegant, and stays out of the way
4. The whole app loads in a single page weighing under 500 KB compressed
5. It works offline once loaded
6. No analytics, no tracking, no network calls except the initial app bundle download
