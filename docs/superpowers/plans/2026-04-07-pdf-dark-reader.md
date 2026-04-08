# PDF Dark Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Svelte 5 web app that lets a user drop a PDF and read it in genuinely good dark mode using vendored doq for canvas-level color transformation, with no backend.

**Architecture:** Pure client-side SPA. Svelte 5 (runes) + TypeScript + Vite. PDFs are read into a browser ArrayBuffer, parsed by `pdfjs-dist`, and rendered to `<canvas>` elements. Vendored doq monkey-patches `CanvasRenderingContext2D` to apply CIELAB color transformation per draw call. UI state lives in two Svelte runes-based stores. UI is a hybrid layout: hidden sidebar in the empty state, sidebar with thumbnails when a PDF is loaded, floating control pill at the bottom for page nav/zoom/theme.

**Tech Stack:** Svelte 5 · TypeScript · Vite · pdfjs-dist (npm) · vendored doq (`prototype/doq/` files copied to `src/lib/doq/`) · vitest + @testing-library/svelte for tests · happy-dom for DOM-in-Node

---

## Reference docs

- **Spec:** `docs/superpowers/specs/2026-04-07-pdf-dark-reader-design.md` — read this first
- **Phase 2 prototype:** `prototype/index.html` — working integration example, validates the approach
- **Vendored doq source:** `prototype/doq/` — copy from here in Task 2

## File structure

This is the complete file list the implementation will produce. Each file has one clear responsibility. Tasks reference these paths exactly.

```
pdf_reader_dark/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── svelte.config.js
├── vitest.config.ts
├── index.html
├── .gitignore
├── README.md
├── public/
│   └── favicon.svg
├── src/
│   ├── main.ts                               # Vite entry
│   ├── app.css                               # global resets, css vars (theme tokens)
│   ├── App.svelte                            # top-level shell, routes empty / reader
│   ├── types.ts                              # shared TS types (Theme, LoadingState, etc.)
│   ├── lib/
│   │   ├── doq/                              # vendored doq (Task 2)
│   │   │   ├── api.js
│   │   │   ├── annots.js
│   │   │   ├── color.js
│   │   │   ├── colors.json
│   │   │   ├── doq.js
│   │   │   ├── engine.js
│   │   │   ├── utils.js
│   │   │   └── LICENSE.txt
│   │   ├── doq-bridge.ts                     # init, setTheme(name,name), enable/disable, list themes
│   │   ├── persist.ts                        # localStorage helpers
│   │   ├── keyboard.ts                       # global keyboard shortcut handler
│   │   ├── pdf/
│   │   │   ├── loader.ts                     # File → ArrayBuffer → PDFDocumentProxy
│   │   │   ├── renderer.ts                   # render a page to a canvas at scale × dpr
│   │   │   └── thumbnail.ts                  # render a low-res thumbnail
│   │   └── stores/
│   │       ├── pdf.svelte.ts                 # current document, current page, loading state
│   │       └── ui.svelte.ts                  # zoom, theme, sidebar collapsed, pill visible, popover open
│   └── components/
│       ├── EmptyState.svelte                 # typewriter, dashed drop zone, subtitle
│       ├── Reader.svelte                     # sidebar + main + pill layout
│       ├── Sidebar.svelte                    # app header, swap icon, thumbnails, chevron
│       ├── ThumbnailList.svelte              # virtualized thumbnail list
│       ├── Thumbnail.svelte                  # single thumbnail (lazy render)
│       ├── PageView.svelte                   # current page canvas, reactive to page/zoom/theme
│       ├── ControlPill.svelte                # floating pill (page nav, zoom, theme button)
│       ├── ThemePopover.svelte               # popover with theme list
│       ├── LoadingOverlay.svelte             # loading state UI
│       ├── ErrorOverlay.svelte               # error message UI
│       └── DragOverlay.svelte                # drag-over highlight
└── tests/
    ├── setup.ts                              # vitest test setup
    ├── lib/
    │   ├── doq-bridge.test.ts
    │   ├── persist.test.ts
    │   ├── keyboard.test.ts
    │   └── pdf/
    │       ├── loader.test.ts
    │       └── renderer.test.ts
    └── stores/
        ├── pdf.test.ts
        └── ui.test.ts
```

**Files NOT covered by this plan (defer to v1.5):** `lib/pdf/text-layer.ts`, `lib/pdf/search.ts`, `components/SearchBar.svelte`.

---

## Test strategy

We use vitest for everything testable in JS/TS-land:

- **Pure modules** (`doq-bridge`, `persist`, `keyboard`, `pdf/loader`, `pdf/renderer`, stores): full unit tests
- **Components**: smoke tests (mounts without throwing) + interaction tests for non-trivial logic
- **Visual quality** (dark mode rendering correctness): manually verified — already done in Phase 2

For canvas tests, we use **happy-dom** as the DOM environment and mock `pdfjs-dist`'s `getDocument`/`page.render` APIs. We do not test pixel output. We test that our code passes the right arguments to PDF.js.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `svelte.config.js`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main.ts`
- Create: `src/app.css`
- Create: `src/App.svelte`
- Create: `tests/setup.ts`

- [ ] **Step 1: Initialize git and create .gitignore**

```bash
cd /Users/bigviking/Documents/github/projects/mhofwell/pdf_reader_dark
git init
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.DS_Store
*.log
.vite/
coverage/
.superpowers/
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "pdf-dark-reader",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "svelte-check --tsconfig ./tsconfig.json"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "@testing-library/svelte": "^5.2.0",
    "@tsconfig/svelte": "^5.0.4",
    "@types/node": "^22.0.0",
    "happy-dom": "^15.0.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "tslib": "^2.6.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0",
    "vitest-canvas-mock": "^0.3.3"
  },
  "dependencies": {
    "pdfjs-dist": "^4.7.76"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "isolatedModules": true,
    "moduleDetection": "force",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "$lib/*": ["src/lib/*"],
      "$components/*": ["src/components/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "tests/**/*.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "svelte.config.js"]
}
```

- [ ] **Step 5: Create `svelte.config.js`**

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true
  }
};
```

- [ ] **Step 6: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $components: resolve(__dirname, 'src/components')
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  worker: {
    format: 'es'
  }
});
```

- [ ] **Step 7: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $components: resolve(__dirname, 'src/components')
    }
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.ts']
  }
});
```

- [ ] **Step 8: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <title>PDF Dark — Made for night reading</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `src/main.ts`**

```ts
import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app')!
});

export default app;
```

- [ ] **Step 10: Create `src/app.css`**

```css
:root {
  --bg: #0f0f10;
  --panel: #1a1a1c;
  --panel-2: #232327;
  --border: #2d2d33;
  --text: #e8e8ea;
  --text-dim: #8a8a92;
  --text-faint: #50505a;
  --accent: #6aa9ff;
  --accent-2: #b894ff;
  --error: #ff6b6b;
  --success: #6ce5a5;
  font-family: -apple-system, "SF Pro Text", system-ui, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100%;
}
```

- [ ] **Step 11: Create `src/App.svelte` (placeholder for now)**

```svelte
<script lang="ts">
</script>

<main>
  <h1>PDF Dark</h1>
  <p>Scaffolding in progress.</p>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text);
  }
  h1 {
    font-size: 24px;
    background: linear-gradient(135deg, #f0f0f4 30%, #b894ff);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  p {
    color: var(--text-dim);
    margin-top: 8px;
  }
</style>
```

- [ ] **Step 12: Create `tests/setup.ts`**

```ts
import '@testing-library/svelte/vitest';
// happy-dom does not implement <canvas>.getContext('2d') in a way that PDF.js
// or doq can call against. vitest-canvas-mock provides a stub that returns a
// non-null context with no-op methods, which is what we need for unit tests
// that verify our code calls the right APIs (we never assert pixel output).
import 'vitest-canvas-mock';
```

- [ ] **Step 13: Install dependencies**

Run: `npm install`
Expected: completes without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 14: Verify dev server runs**

Run: `npm run dev`
Expected: Vite starts on `http://localhost:5173`. Open in a browser, see "PDF Dark" gradient heading and "Scaffolding in progress." subtitle. Stop with Ctrl+C.

- [ ] **Step 15: Verify test runner works**

Run: `npm test`
Expected: vitest runs and reports "No test files found" (or similar — that's fine, we have no tests yet).

- [ ] **Step 16: Verify type-check works**

Run: `npm run check`
Expected: svelte-check exits with 0 errors.

- [ ] **Step 17: Commit**

```bash
git add .
git commit -m "feat: initial Svelte 5 + Vite + TypeScript scaffold"
```

---

## Task 2: Vendor doq and write the bridge

**Files:**
- Copy: `prototype/doq/*` → `src/lib/doq/*`
- Create: `src/lib/doq-bridge.ts`
- Create: `src/types.ts`
- Test: `tests/lib/doq-bridge.test.ts`

**Context:** doq is an MIT-licensed canvas-level dark mode library that monkey-patches `CanvasRenderingContext2D.prototype` globally. It has no NPM package — we vendor the source. We wrap it in a TypeScript bridge that hides its quirks (in particular: the multi-word tone bug from Phase 2).

- [ ] **Step 1: Copy doq source files into the project**

```bash
mkdir -p src/lib/doq
cp prototype/doq/api.js src/lib/doq/
cp prototype/doq/annots.js src/lib/doq/
cp prototype/doq/color.js src/lib/doq/
cp prototype/doq/colors.json src/lib/doq/
cp prototype/doq/doq.js src/lib/doq/
cp prototype/doq/engine.js src/lib/doq/
cp prototype/doq/utils.js src/lib/doq/
cp prototype/doq/LICENSE.txt src/lib/doq/
```

- [ ] **Step 2: Create `src/types.ts` with shared types**

```ts
export type ThemeId = string; // Format: "scheme/tone", e.g. "Nord/Polar Night"

export interface Theme {
  id: ThemeId;
  schemeName: string;
  toneName: string;
  schemeIdx: number;
  toneIdx: number;
  background: string;
  foreground: string;
}

export interface DoqColorScheme {
  name: string;
  tones: Array<{
    name: string;
    background: string;
    foreground: string;
    accents?: string[];
  }>;
  accents?: string[];
}

export type LoadingState =
  | 'idle'
  | 'reading-file'
  | 'parsing'
  | 'rendering'
  | 'ready'
  | 'error';
```

- [ ] **Step 3: Write the failing test for `doq-bridge.listThemes()`**

Create `tests/lib/doq-bridge.test.ts`:

```ts
import { describe, it, expect, beforeAll, vi } from 'vitest';

// doq.init() fetches colors.json relative to api.js's import.meta.url.
// In happy-dom we mock the fetch to return the bundled colors.
import colorsData from '../../src/lib/doq/colors.json';

describe('doq-bridge', () => {
  beforeAll(() => {
    // @ts-expect-error - mocking global fetch
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(colorsData)
      })
    );
  });

  it('lists themes after init', async () => {
    const { initDoq, listThemes } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const themes = listThemes();
    expect(themes.length).toBeGreaterThan(0);
    expect(themes[0]).toHaveProperty('id');
    expect(themes[0]).toHaveProperty('schemeName');
    expect(themes[0]).toHaveProperty('toneName');
  });

  it('finds Nord Polar Night by name (multi-word tone)', async () => {
    const { initDoq, findTheme } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const theme = findTheme('Nord', 'Polar Night');
    expect(theme).not.toBeNull();
    expect(theme!.schemeName).toBe('Nord');
    expect(theme!.toneName).toBe('Polar Night');
    expect(typeof theme!.schemeIdx).toBe('number');
    expect(typeof theme!.toneIdx).toBe('number');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `doq-bridge` module not found.

- [ ] **Step 5: Implement `src/lib/doq-bridge.ts`**

```ts
import doqDefault from './doq/doq.js';
import colorsData from './doq/colors.json';
import type { Theme, ThemeId, DoqColorScheme } from '../types';

// doq's API surface (untyped JS)
interface DoqAPI {
  init(themes?: DoqColorScheme[]): Promise<void>;
  setTheme(arg: [number, number] | string): void;
  enable(): void;
  disable(): void;
}

const doq = doqDefault as unknown as DoqAPI;

let initialized = false;
let themes: Theme[] = [];

export async function initDoq(): Promise<void> {
  if (initialized) return;

  // Pass themes explicitly to avoid the relative-fetch issue when bundled.
  await doq.init(colorsData as DoqColorScheme[]);

  themes = (colorsData as DoqColorScheme[]).flatMap((scheme, schemeIdx) =>
    scheme.tones.map((tone, toneIdx) => ({
      id: `${scheme.name}/${tone.name}`,
      schemeName: scheme.name,
      toneName: tone.name,
      schemeIdx,
      toneIdx,
      background: tone.background,
      foreground: tone.foreground
    }))
  );

  initialized = true;
}

export function listThemes(): Theme[] {
  return themes;
}

export function findTheme(schemeName: string, toneName: string): Theme | null {
  return themes.find((t) => t.schemeName === schemeName && t.toneName === toneName) ?? null;
}

export function findThemeById(id: ThemeId): Theme | null {
  return themes.find((t) => t.id === id) ?? null;
}

/**
 * Apply a theme. Always uses the array form [schemeIdx, toneIdx] to avoid
 * doq's string parser bug with multi-word tone names like "Polar Night".
 * Calling setTheme also enables the engine.
 */
export function setActiveTheme(theme: Theme): void {
  doq.setTheme([theme.schemeIdx, theme.toneIdx]);
}

export function enableDoq(): void {
  doq.enable();
}

export function disableDoq(): void {
  doq.disable();
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, both tests green.

- [ ] **Step 7: Add a test for setActiveTheme not throwing on multi-word tones**

Append to `tests/lib/doq-bridge.test.ts` inside the existing `describe`:

```ts
  it('setActiveTheme works for multi-word tones (regression for doq parser bug)', async () => {
    const { initDoq, findTheme, setActiveTheme } = await import('../../src/lib/doq-bridge');
    await initDoq();
    const theme = findTheme('Nord', 'Polar Night');
    expect(theme).not.toBeNull();
    expect(() => setActiveTheme(theme!)).not.toThrow();
  });
```

- [ ] **Step 8: Run the test**

Run: `npm test`
Expected: PASS, all 3 tests green.

- [ ] **Step 9: Commit**

```bash
git add src/lib/doq src/lib/doq-bridge.ts src/types.ts tests/lib/doq-bridge.test.ts
git commit -m "feat(doq): vendor doq source and add typed bridge"
```

---

## Task 3: PDF loader

**Files:**
- Create: `src/lib/pdf/loader.ts`
- Test: `tests/lib/pdf/loader.test.ts`

**Context:** Wraps `pdfjs-dist`'s `getDocument` with a clean async function. Sets up the PDF.js worker. Returns a typed `PDFDocumentProxy` or throws a tagged error.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/pdf/loader.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pdfjs-dist', () => {
  const fakeDoc = { numPages: 32 };
  // Define stub exception classes that match pdfjs-dist's real names so
  // instanceof checks in the loader can work in tests too.
  class PasswordException extends Error {}
  class InvalidPDFException extends Error {}
  class MissingPDFException extends Error {}
  class UnexpectedResponseException extends Error {}
  return {
    getDocument: vi.fn(() => ({ promise: Promise.resolve(fakeDoc) })),
    GlobalWorkerOptions: { workerSrc: '' },
    PasswordException,
    InvalidPDFException,
    MissingPDFException,
    UnexpectedResponseException
  };
});

beforeEach(() => {
  vi.resetModules();
});

describe('pdf/loader', () => {
  it('loadPdfFromBuffer returns a PDFDocumentProxy', async () => {
    const { loadPdfFromBuffer } = await import('../../../src/lib/pdf/loader');
    const buf = new ArrayBuffer(8);
    const doc = await loadPdfFromBuffer(buf);
    expect(doc.numPages).toBe(32);
  });

  it('loadPdfFromFile reads file then loads', async () => {
    const { loadPdfFromFile } = await import('../../../src/lib/pdf/loader');
    const file = new File([new Uint8Array([1, 2, 3])], 'test.pdf', { type: 'application/pdf' });
    const doc = await loadPdfFromFile(file);
    expect(doc.numPages).toBe(32);
  });

  it('rejects non-PDF files', async () => {
    const { loadPdfFromFile } = await import('../../../src/lib/pdf/loader');
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    await expect(loadPdfFromFile(file)).rejects.toThrow(/not a pdf/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `loader` module not found.

- [ ] **Step 3: Implement `src/lib/pdf/loader.ts`**

```ts
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// PDF.js exports specific error classes — use instanceof rather than regex
// matching against err.message, which is brittle across versions and locales.
import {
  PasswordException,
  InvalidPDFException,
  MissingPDFException,
  UnexpectedResponseException
} from 'pdfjs-dist';

// Set up the PDF.js worker. Vite will resolve this URL at build time.
// In tests, this is harmless because we mock pdfjs-dist entirely.
// NOTE: The worker path is sensitive to pdfjs-dist's internal layout. v4.7.x
// uses build/pdf.worker.min.mjs — verify this still exists when bumping versions.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export type PdfLoadErrorKind =
  | 'not-a-pdf'
  | 'corrupt'
  | 'encrypted'
  | 'missing'
  | 'network'
  | 'unknown';

export class PdfLoadError extends Error {
  constructor(
    message: string,
    public readonly kind: PdfLoadErrorKind
  ) {
    super(message);
    this.name = 'PdfLoadError';
  }
}

export async function loadPdfFromFile(file: File): Promise<PDFDocumentProxy> {
  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new PdfLoadError(`That's not a PDF: ${file.name}`, 'not-a-pdf');
  }
  const buffer = await file.arrayBuffer();
  return loadPdfFromBuffer(buffer);
}

export async function loadPdfFromBuffer(buffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  try {
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
    return doc;
  } catch (err) {
    if (err instanceof PasswordException) {
      throw new PdfLoadError('This PDF is password-protected.', 'encrypted');
    }
    if (err instanceof InvalidPDFException) {
      throw new PdfLoadError("Couldn't read this PDF — it might be damaged.", 'corrupt');
    }
    if (err instanceof MissingPDFException) {
      throw new PdfLoadError('PDF data is missing.', 'missing');
    }
    if (err instanceof UnexpectedResponseException) {
      throw new PdfLoadError('Network error while loading the PDF.', 'network');
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new PdfLoadError(msg, 'unknown');
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, all tests in `loader.test.ts` green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/loader.ts tests/lib/pdf/loader.test.ts
git commit -m "feat(pdf): add typed PDF loader with error tagging"
```

---

## Task 4: PDF renderer

**Files:**
- Create: `src/lib/pdf/renderer.ts`
- Test: `tests/lib/pdf/renderer.test.ts`

**Context:** Renders a single PDF page to a canvas at a given scale, with optional doq dark mode applied. Handles high-DPI by rendering at `scale × devicePixelRatio` internally and displaying at `scale` CSS pixels via the PDF.js `transform` parameter (validated in Phase 2).

- [ ] **Step 1: Write the failing test**

Create `tests/lib/pdf/renderer.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeViewport = { width: 612, height: 792 };
const renderPromise = vi.fn(() => ({ promise: Promise.resolve() }));
const fakePage = {
  getViewport: vi.fn(() => fakeViewport),
  render: renderPromise
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pdf/renderer', () => {
  it('renderPageToCanvas sets canvas size and calls page.render with the right params', async () => {
    const { renderPageToCanvas } = await import('../../../src/lib/pdf/renderer');
    const canvas = document.createElement('canvas');
    await renderPageToCanvas(fakePage as any, canvas, { scale: 1.5, dpr: 2 });

    // Internal pixel size = viewport × dpr
    expect(canvas.width).toBe(612 * 2);
    expect(canvas.height).toBe(792 * 2);
    // CSS size = viewport
    expect(canvas.style.width).toBe('612px');
    expect(canvas.style.height).toBe('792px');

    // page.render called with the dpr transform
    expect(renderPromise).toHaveBeenCalledTimes(1);
    const renderArgs = renderPromise.mock.calls[0][0];
    expect(renderArgs.viewport).toBe(fakeViewport);
    expect(renderArgs.transform).toEqual([2, 0, 0, 2, 0, 0]);
    expect(renderArgs.canvasContext).toBeDefined();
  });

  it('omits the transform field when dpr=1', async () => {
    const { renderPageToCanvas } = await import('../../../src/lib/pdf/renderer');
    const canvas = document.createElement('canvas');
    await renderPageToCanvas(fakePage as any, canvas, { scale: 1, dpr: 1 });
    expect(renderPromise.mock.calls[0][0].transform).toBeUndefined();
  });

  it('passes a unique cacheId to canvas dataset', async () => {
    const { renderPageToCanvas } = await import('../../../src/lib/pdf/renderer');
    const canvas = document.createElement('canvas');
    await renderPageToCanvas(fakePage as any, canvas, { scale: 1, dpr: 1, cacheId: 'page-3' });
    expect(canvas.dataset.cacheId).toBe('page-3');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `renderer` module not found.

- [ ] **Step 3: Implement `src/lib/pdf/renderer.ts`**

```ts
import type { PDFPageProxy } from 'pdfjs-dist';

export interface RenderOptions {
  /** PDF.js scale (1.0 = native PDF coordinates ≈ 72 DPI) */
  scale: number;
  /** Device pixel ratio. Use window.devicePixelRatio in app code. */
  dpr: number;
  /** Optional cache id used by doq's per-canvas color cache */
  cacheId?: string;
}

/**
 * Render a single PDF page to a canvas. Sets up high-DPI rendering by
 * making the canvas internally `viewport × dpr` pixels and CSS-displaying
 * at `viewport` size, with PDF.js's transform parameter handling the scale.
 *
 * The actual dark mode transformation is applied automatically by doq if
 * doq.enable() / doq.setTheme() has been called — this function does NOT
 * touch doq itself.
 */
export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  opts: RenderOptions
): Promise<void> {
  const viewport = page.getViewport({ scale: opts.scale });

  canvas.width = Math.floor(viewport.width * opts.dpr);
  canvas.height = Math.floor(viewport.height * opts.dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  if (opts.cacheId) {
    canvas.dataset.cacheId = opts.cacheId;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D rendering context');
  }

  // PDF.js's render parameter type uses `transform?: number[]` (optional, not
  // nullable). When dpr=1, omit the field entirely via conditional spread —
  // passing `null` would be a TypeScript error.
  await page.render({
    canvasContext: ctx,
    viewport,
    ...(opts.dpr !== 1 && {
      transform: [opts.dpr, 0, 0, opts.dpr, 0, 0] as [number, number, number, number, number, number]
    })
  } as Parameters<PDFPageProxy['render']>[0]).promise;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, all 3 renderer tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/renderer.ts tests/lib/pdf/renderer.test.ts
git commit -m "feat(pdf): add high-DPI page renderer"
```

---

## Task 5: PDF thumbnail renderer

**Files:**
- Create: `src/lib/pdf/thumbnail.ts`

**Context:** A thin wrapper around the renderer that renders at a small fixed pixel width for sidebar thumbnails. doq is honored automatically (whatever theme is active when called).

- [ ] **Step 1: Implement `src/lib/pdf/thumbnail.ts`**

```ts
import type { PDFPageProxy } from 'pdfjs-dist';
import { renderPageToCanvas } from './renderer';

const THUMBNAIL_WIDTH_PX = 150; // CSS pixels

/**
 * Renders a low-res thumbnail of a PDF page to a canvas.
 * Width is fixed at THUMBNAIL_WIDTH_PX; height is computed from the page aspect ratio.
 */
export async function renderThumbnail(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement
): Promise<void> {
  // Get a viewport at scale 1 just to compute aspect ratio
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = THUMBNAIL_WIDTH_PX / baseViewport.width;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  await renderPageToCanvas(page, canvas, {
    scale,
    dpr,
    cacheId: `thumb-${(page as unknown as { _pageIndex: number })._pageIndex}-${Date.now()}`
  });
}

export { THUMBNAIL_WIDTH_PX };
```

- [ ] **Step 2: Type-check passes**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf/thumbnail.ts
git commit -m "feat(pdf): add thumbnail renderer"
```

---

## Task 6: localStorage persistence

**Files:**
- Create: `src/lib/persist.ts`
- Test: `tests/lib/persist.test.ts`

**Context:** A tiny generic wrapper around localStorage with JSON serialization, default values, and SSR/test safety. Used by the UI store for theme and sidebar state.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/persist.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('persist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('readPersisted returns default when key absent', async () => {
    const { readPersisted } = await import('../../src/lib/persist');
    expect(readPersisted('missing', 42)).toBe(42);
  });

  it('readPersisted parses JSON values', async () => {
    const { readPersisted, writePersisted } = await import('../../src/lib/persist');
    writePersisted('mykey', { a: 1, b: 'two' });
    expect(readPersisted('mykey', null)).toEqual({ a: 1, b: 'two' });
  });

  it('readPersisted falls back to default on parse error', async () => {
    const { readPersisted } = await import('../../src/lib/persist');
    localStorage.setItem('badkey', 'not-json{');
    expect(readPersisted('badkey', 'default')).toBe('default');
  });

  it('writePersisted serializes', async () => {
    const { writePersisted } = await import('../../src/lib/persist');
    writePersisted('flag', true);
    expect(localStorage.getItem('flag')).toBe('true');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `persist` module not found.

- [ ] **Step 3: Implement `src/lib/persist.ts`**

```ts
const PREFIX = 'pdfdark.';

export function readPersisted<T>(key: string, defaultValue: T): T {
  if (typeof localStorage === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function writePersisted<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — fail silently
  }
}
```

Update test imports — the test already uses `localStorage.setItem('badkey', ...)` without prefix, but our `readPersisted('badkey', ...)` will look for `pdfdark.badkey`. Fix the test:

```ts
// Replace the third test case body in tests/lib/persist.test.ts:
  it('readPersisted falls back to default on parse error', async () => {
    const { readPersisted } = await import('../../src/lib/persist');
    localStorage.setItem('pdfdark.badkey', 'not-json{');
    expect(readPersisted('badkey', 'default')).toBe('default');
  });
```

Also update the writePersisted test since it now uses the prefix:

```ts
// Replace the fourth test case:
  it('writePersisted serializes', async () => {
    const { writePersisted } = await import('../../src/lib/persist');
    writePersisted('flag', true);
    expect(localStorage.getItem('pdfdark.flag')).toBe('true');
  });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, all 4 persist tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/persist.ts tests/lib/persist.test.ts
git commit -m "feat: add localStorage persistence helpers"
```

---

## Task 7: Stores (pdf and ui)

**Files:**
- Create: `src/lib/stores/pdf.svelte.ts`
- Create: `src/lib/stores/ui.svelte.ts`
- Test: `tests/stores/pdf.test.ts`
- Test: `tests/stores/ui.test.ts`

**Context:** Two Svelte 5 runes-based stores. The `pdf` store holds the current document and page state. The `ui` store holds zoom level, theme, sidebar collapsed, pill visibility, and popover open state, with persistence for theme and sidebar.

- [ ] **Step 1: Write the failing test for the pdf store**

Create `tests/stores/pdf.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(async () => {
  // Reset module state between tests
  const mod = await import('../../src/lib/stores/pdf.svelte');
  mod.pdf.reset();
});

describe('pdf store', () => {
  it('starts in idle state with no doc', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    expect(pdf.doc).toBeNull();
    expect(pdf.numPages).toBe(0);
    expect(pdf.currentPage).toBe(1);
    expect(pdf.loadingState).toBe('idle');
  });

  it('setDocument populates doc, numPages, resets currentPage', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    const fakeDoc = { numPages: 32 } as any;
    pdf.setDocument(fakeDoc, 'test.pdf');
    expect(pdf.doc).toBe(fakeDoc);
    expect(pdf.numPages).toBe(32);
    expect(pdf.currentPage).toBe(1);
    expect(pdf.filename).toBe('test.pdf');
    expect(pdf.loadingState).toBe('ready');
  });

  it('goToPage clamps to [1, numPages]', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    pdf.setDocument({ numPages: 5 } as any, 'a.pdf');
    pdf.goToPage(3);
    expect(pdf.currentPage).toBe(3);
    pdf.goToPage(0);
    expect(pdf.currentPage).toBe(1);
    pdf.goToPage(99);
    expect(pdf.currentPage).toBe(5);
  });

  it('nextPage / prevPage respect boundaries', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    pdf.setDocument({ numPages: 3 } as any, 'a.pdf');
    pdf.nextPage();
    expect(pdf.currentPage).toBe(2);
    pdf.nextPage();
    pdf.nextPage();
    expect(pdf.currentPage).toBe(3); // capped
    pdf.prevPage();
    expect(pdf.currentPage).toBe(2);
    pdf.prevPage();
    pdf.prevPage();
    expect(pdf.currentPage).toBe(1); // capped
  });

  it('setError moves to error state', async () => {
    const { pdf } = await import('../../src/lib/stores/pdf.svelte');
    pdf.setError('boom');
    expect(pdf.loadingState).toBe('error');
    expect(pdf.errorMessage).toBe('boom');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `pdf.svelte` store not found.

- [ ] **Step 3: Implement `src/lib/stores/pdf.svelte.ts`**

```ts
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { LoadingState } from '../../types';

class PdfStore {
  doc = $state<PDFDocumentProxy | null>(null);
  numPages = $state(0);
  currentPage = $state(1);
  filename = $state('');
  loadingState = $state<LoadingState>('idle');
  errorMessage = $state('');

  setLoading(state: Exclude<LoadingState, 'ready' | 'error'>): void {
    this.loadingState = state;
    this.errorMessage = '';
  }

  setDocument(doc: PDFDocumentProxy, filename: string): void {
    this.doc = doc;
    this.numPages = doc.numPages;
    this.currentPage = 1;
    this.filename = filename;
    this.loadingState = 'ready';
    this.errorMessage = '';
  }

  setError(message: string): void {
    this.loadingState = 'error';
    this.errorMessage = message;
  }

  goToPage(n: number): void {
    if (this.numPages === 0) return;
    this.currentPage = Math.max(1, Math.min(this.numPages, n));
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  reset(): void {
    this.doc = null;
    this.numPages = 0;
    this.currentPage = 1;
    this.filename = '';
    this.loadingState = 'idle';
    this.errorMessage = '';
  }
}

export const pdf = new PdfStore();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, all 5 pdf store tests green.

- [ ] **Step 5: Write the failing test for the ui store**

Create `tests/stores/ui.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(async () => {
  localStorage.clear();
  const mod = await import('../../src/lib/stores/ui.svelte');
  mod.ui.reset();
});

describe('ui store', () => {
  it('starts with default zoom 100% (index 2)', async () => {
    const { ui, ZOOM_LEVELS } = await import('../../src/lib/stores/ui.svelte');
    expect(ui.zoomIndex).toBe(2);
    expect(ZOOM_LEVELS[ui.zoomIndex]).toBe(1);
    expect(ui.effectiveScale).toBe(1.5); // BASE_SCALE = 1.5
  });

  it('zoomIn / zoomOut clamp at boundaries', async () => {
    const { ui, ZOOM_LEVELS } = await import('../../src/lib/stores/ui.svelte');
    for (let i = 0; i < 20; i++) ui.zoomIn();
    expect(ui.zoomIndex).toBe(ZOOM_LEVELS.length - 1);
    for (let i = 0; i < 20; i++) ui.zoomOut();
    expect(ui.zoomIndex).toBe(0);
  });

  it('canZoomIn and canZoomOut reflect zoom boundaries', async () => {
    const { ui, ZOOM_LEVELS } = await import('../../src/lib/stores/ui.svelte');
    // Default zoom (index 2) — both directions available
    expect(ui.canZoomIn).toBe(true);
    expect(ui.canZoomOut).toBe(true);
    // Zoom to the max
    for (let i = 0; i < ZOOM_LEVELS.length; i++) ui.zoomIn();
    expect(ui.canZoomIn).toBe(false);
    expect(ui.canZoomOut).toBe(true);
    // Zoom to the min
    for (let i = 0; i < ZOOM_LEVELS.length; i++) ui.zoomOut();
    expect(ui.canZoomIn).toBe(true);
    expect(ui.canZoomOut).toBe(false);
  });

  it('resetZoom sets to 100%', async () => {
    const { ui } = await import('../../src/lib/stores/ui.svelte');
    ui.zoomIn();
    ui.zoomIn();
    ui.resetZoom();
    expect(ui.zoomIndex).toBe(2);
  });

  it('setSidebarCollapsed persists to localStorage', async () => {
    const { ui } = await import('../../src/lib/stores/ui.svelte');
    ui.setSidebarCollapsed(true);
    expect(ui.sidebarCollapsed).toBe(true);
    expect(localStorage.getItem('pdfdark.sidebarCollapsed')).toBe('true');
  });

  it('setActiveThemeId persists', async () => {
    const { ui } = await import('../../src/lib/stores/ui.svelte');
    ui.setActiveThemeId('Nord/Polar Night');
    expect(ui.activeThemeId).toBe('Nord/Polar Night');
    expect(localStorage.getItem('pdfdark.activeThemeId')).toBe('"Nord/Polar Night"');
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `ui.svelte` store not found.

- [ ] **Step 7: Implement `src/lib/stores/ui.svelte.ts`**

```ts
import { readPersisted, writePersisted } from '../persist';
import type { ThemeId } from '../../types';

export const BASE_SCALE = 1.5; // 100% = scale 1.5 (Adobe-style "actual size")
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const DEFAULT_ZOOM_INDEX = ZOOM_LEVELS.indexOf(1);
const DEFAULT_THEME_ID: ThemeId = 'Firefox/Dark';

class UiStore {
  zoomIndex = $state(DEFAULT_ZOOM_INDEX);
  sidebarCollapsed = $state(readPersisted<boolean>('sidebarCollapsed', false));
  activeThemeId = $state<ThemeId>(readPersisted<ThemeId>('activeThemeId', DEFAULT_THEME_ID));
  pillVisible = $state(true);
  themePopoverOpen = $state(false);
  dragOver = $state(false);

  effectiveScale = $derived(ZOOM_LEVELS[this.zoomIndex] * BASE_SCALE);
  zoomPercent = $derived(Math.round(ZOOM_LEVELS[this.zoomIndex] * 100));
  canZoomIn = $derived(this.zoomIndex < ZOOM_LEVELS.length - 1);
  canZoomOut = $derived(this.zoomIndex > 0);

  zoomIn(): void {
    if (this.canZoomIn) this.zoomIndex++;
  }

  zoomOut(): void {
    if (this.canZoomOut) this.zoomIndex--;
  }

  resetZoom(): void {
    this.zoomIndex = DEFAULT_ZOOM_INDEX;
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
    writePersisted('sidebarCollapsed', collapsed);
  }

  toggleSidebar(): void {
    this.setSidebarCollapsed(!this.sidebarCollapsed);
  }

  setActiveThemeId(id: ThemeId): void {
    this.activeThemeId = id;
    writePersisted('activeThemeId', id);
  }

  setPillVisible(v: boolean): void {
    this.pillVisible = v;
  }

  setThemePopoverOpen(o: boolean): void {
    this.themePopoverOpen = o;
  }

  setDragOver(d: boolean): void {
    this.dragOver = d;
  }

  reset(): void {
    this.zoomIndex = DEFAULT_ZOOM_INDEX;
    this.sidebarCollapsed = false;
    this.activeThemeId = DEFAULT_THEME_ID;
    this.pillVisible = true;
    this.themePopoverOpen = false;
    this.dragOver = false;
  }
}

export const ui = new UiStore();
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, all ui store tests green.

- [ ] **Step 9: Commit**

```bash
git add src/lib/stores tests/stores
git commit -m "feat(stores): add pdf and ui stores with persistence"
```

---

## Task 8: EmptyState component

**Files:**
- Create: `src/components/EmptyState.svelte`

**Context:** The empty state shown when no PDF is loaded. Sidebar is hidden (handled by parent App.svelte). Centered dashed drop zone with the typewriter title and crescent moon. Subtitle below the box. Clicking the box opens the file picker. Drag-drop is handled at the App level (Task 10).

- [ ] **Step 1: Implement `src/components/EmptyState.svelte`**

```svelte
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

  function handleKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }
</script>

<div class="empty">
  <button
    type="button"
    class="drop-zone"
    onclick={handleClick}
    onkeydown={handleKey}
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
```

- [ ] **Step 2: Type-check passes**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/EmptyState.svelte
git commit -m "feat(ui): add EmptyState with typewriter and drop zone"
```

---

## Task 9: PageView component

**Files:**
- Create: `src/components/PageView.svelte`

**Context:** Renders the current PDF page to a canvas, reactively re-rendering when `pdf.currentPage`, `ui.effectiveScale`, or `ui.activeThemeId` changes. Uses doq-bridge to set the active theme before rendering.

- [ ] **Step 1: Implement `src/components/PageView.svelte`**

```svelte
<script lang="ts">
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { renderPageToCanvas } from '$lib/pdf/renderer';
  import { findThemeById, setActiveTheme, listThemes } from '$lib/doq-bridge';

  let canvasContainer: HTMLDivElement;
  let currentRenderToken = 0;
  let renderErrorMessage = $state<string | null>(null);

  $effect(() => {
    // Reactivity: re-run when these change
    const doc = pdf.doc;
    const page = pdf.currentPage;
    const scale = ui.effectiveScale;
    const themeId = ui.activeThemeId;

    if (!doc) return;

    const myToken = ++currentRenderToken;

    // Theme fallback chain: stored ID → default → first available.
    // doq.enable() throws if no theme has been set, so we MUST ensure
    // setActiveTheme has been called at least once.
    const theme =
      findThemeById(themeId) ??
      findThemeById('Firefox/Dark') ??
      listThemes()[0] ??
      null;
    if (theme) {
      setActiveTheme(theme);
    }
    // If theme is null, doq has zero schemes — we render in light mode and
    // the page still works.

    (async () => {
      try {
        const pdfPage = await doc.getPage(page);
        if (myToken !== currentRenderToken) return; // newer render started

        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        await renderPageToCanvas(pdfPage, canvas, {
          scale,
          dpr,
          cacheId: `page-${page}-${themeId}-${Date.now()}`
        });

        if (myToken !== currentRenderToken) return;
        // Defensive: component may have unmounted between async ticks
        if (!canvasContainer) return;

        renderErrorMessage = null;
        canvasContainer.replaceChildren(canvas);
      } catch (err) {
        if (myToken !== currentRenderToken) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Failed to render page', err);
        // Per spec §9: show a placeholder for the failed page, don't break navigation.
        renderErrorMessage = `This page failed to render (${msg})`;
        if (canvasContainer) {
          canvasContainer.replaceChildren();
        }
      }
    })();
  });
</script>

<div
  class="page-view"
  role="region"
  aria-label="PDF page viewer"
  aria-live="polite"
  aria-atomic="true"
>
  <div class="sr-only">Page {pdf.currentPage} of {pdf.numPages}</div>
  {#if renderErrorMessage}
    <div class="render-error" role="alert">
      <p>{renderErrorMessage}</p>
      <p class="hint">You can still navigate to other pages.</p>
    </div>
  {/if}
  <div class="canvas-container" bind:this={canvasContainer}></div>
</div>

<style>
  .page-view {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 32px 24px 90px 24px; /* bottom padding leaves room for the floating pill */
    background: var(--bg);
    position: relative;
  }

  .canvas-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .canvas-container :global(canvas) {
    display: block;
    border: 1px solid var(--border);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .render-error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px 32px;
    text-align: center;
    max-width: 360px;
    color: var(--text);
  }

  .render-error .hint {
    margin-top: 8px;
    color: var(--text-dim);
    font-size: 12px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
```

- [ ] **Step 2: Type-check passes**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PageView.svelte
git commit -m "feat(ui): add reactive PageView component"
```

---

## Task 10: App shell with drop handling

**Files:**
- Modify: `src/App.svelte`

**Context:** Wires together the empty state and the reader. Handles whole-window drag-and-drop, file picker callbacks, and PDF loading. Initializes doq on mount.

- [ ] **Step 1: Replace `src/App.svelte` with the full shell**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import EmptyState from './components/EmptyState.svelte';
  import PageView from './components/PageView.svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { initDoq, findThemeById, setActiveTheme, listThemes } from '$lib/doq-bridge';
  import { loadPdfFromBuffer, PdfLoadError } from '$lib/pdf/loader';

  let doqReady = $state(false);

  onMount(async () => {
    try {
      await initDoq();
      // Theme fallback chain: stored ID → default → first available.
      // doq.enable() throws if no theme has been set, so we MUST resolve to
      // an actual theme before any rendering occurs.
      const theme =
        findThemeById(ui.activeThemeId) ??
        findThemeById('Firefox/Dark') ??
        listThemes()[0] ??
        null;
      if (theme) {
        setActiveTheme(theme);
      }
      // If theme is null, doq has zero schemes — light rendering only.
    } catch (err) {
      console.error('doq init failed', err);
      // Fall back to non-dark rendering — the reader still works.
    } finally {
      doqReady = true;
    }
  });

  async function handleFile(file: File): Promise<void> {
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      pdf.setError(`That's not a PDF: ${file.name}`);
      return;
    }
    try {
      // Distinct loading phases — each await yields, letting the LoadingOverlay
      // observe the state transition. Without splitting these the 'reading-file'
      // state would never be visible (set + immediately overwritten).
      pdf.setLoading('reading-file');
      const buffer = await file.arrayBuffer();
      pdf.setLoading('parsing');
      const doc = await loadPdfFromBuffer(buffer);
      pdf.setDocument(doc, file.name);
    } catch (err) {
      if (err instanceof PdfLoadError) {
        pdf.setError(err.message);
      } else {
        pdf.setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
  }

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    ui.setDragOver(true);
  }

  function handleDragLeave(e: DragEvent): void {
    // Only clear when leaving the window entirely
    if (e.relatedTarget === null) {
      ui.setDragOver(false);
    }
  }

  async function handleDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    ui.setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) await handleFile(file);
  }
</script>

<svelte:window
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
/>

<main class="app">
  {#if !doqReady}
    <div class="loading">Loading…</div>
  {:else if pdf.doc}
    <PageView />
  {:else}
    <EmptyState onFileSelected={handleFile} />
  {/if}
</main>

<style>
  .app {
    height: 100vh;
    display: flex;
    background: var(--bg);
  }

  .loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-size: 13px;
  }
</style>
```

- [ ] **Step 2: Run the dev server and verify the empty state**

Run: `npm run dev`
Expected: app loads, shows the dashed drop zone with the typewriter "Made for night reading." that types in once and the cursor fades out. Subtitle "Drop in a PDF to start." below the box. Drop a real PDF onto the window — the empty state should be replaced by a rendered page.

Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/App.svelte
git commit -m "feat(app): wire EmptyState, PageView, and global drop handling"
```

---

## Task 11: ControlPill component

**Files:**
- Create: `src/components/ControlPill.svelte`

**Context:** The floating pill at the bottom of the reader. Contains page nav (prev / `4 / 32` / next), zoom (`-` / `100%` / `+`), and a theme button that opens the popover (added in Task 12). The pill's auto-hide behavior comes in Task 13.

- [ ] **Step 1: Implement `src/components/ControlPill.svelte`**

```svelte
<script lang="ts">
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';

  function toggleThemePopover(): void {
    ui.setThemePopoverOpen(!ui.themePopoverOpen);
  }
</script>

{#if ui.pillVisible}
  <div class="pill">
    <button
      class="pill-btn"
      onclick={() => pdf.prevPage()}
      disabled={pdf.currentPage <= 1}
      aria-label="Previous page"
    >
      ‹
    </button>
    <span class="pill-text">{pdf.currentPage} / {pdf.numPages}</span>
    <button
      class="pill-btn"
      onclick={() => pdf.nextPage()}
      disabled={pdf.currentPage >= pdf.numPages}
      aria-label="Next page"
    >
      ›
    </button>

    <span class="pill-sep"></span>

    <button
      class="pill-btn"
      onclick={() => ui.zoomOut()}
      disabled={!ui.canZoomOut}
      aria-label="Zoom out"
    >
      −
    </button>
    <button
      class="pill-text pill-text-button"
      onclick={() => ui.resetZoom()}
      aria-label="Reset zoom to 100%"
    >
      {ui.zoomPercent}%
    </button>
    <button
      class="pill-btn"
      onclick={() => ui.zoomIn()}
      disabled={!ui.canZoomIn}
      aria-label="Zoom in"
    >
      +
    </button>

    <span class="pill-sep"></span>

    <button
      class="pill-btn theme-btn"
      class:active={ui.themePopoverOpen}
      onclick={toggleThemePopover}
      aria-label="Theme picker"
      aria-expanded={ui.themePopoverOpen}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"></circle>
        <circle cx="7.5" cy="10.5" r="1" fill="currentColor"></circle>
        <circle cx="12" cy="7.5" r="1" fill="currentColor"></circle>
        <circle cx="16.5" cy="10.5" r="1" fill="currentColor"></circle>
        <circle cx="14" cy="15.5" r="1" fill="currentColor"></circle>
      </svg>
    </button>
  </div>
{/if}

<style>
  .pill {
    position: fixed;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(28, 28, 32, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    padding: 6px 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
    z-index: 100;
  }

  .pill-btn {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: transparent;
    border: none;
    color: #c0c0c8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: background 120ms ease;
  }

  .pill-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
  }

  .pill-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .pill-btn.active {
    background: rgba(106, 169, 255, 0.16);
    color: var(--accent);
  }

  .pill-text {
    color: #c0c0c8;
    font-size: 11px;
    padding: 0 8px;
    font-variant-numeric: tabular-nums;
    min-width: 36px;
    text-align: center;
    line-height: 28px;
  }

  .pill-text-button {
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 14px;
    font-family: inherit;
    transition: background 120ms ease;
  }

  .pill-text-button:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .pill-sep {
    width: 1px;
    height: 18px;
    background: rgba(255, 255, 255, 0.08);
    margin: 0 4px;
  }
</style>
```

- [ ] **Step 2: Add the pill to the reader**

Modify `src/App.svelte` — replace the `<PageView />` line in the `{:else if pdf.doc}` block with:

```svelte
  {:else if pdf.doc}
    <PageView />
    <ControlPill />
```

And add the import at the top of the script block:

```ts
  import ControlPill from './components/ControlPill.svelte';
```

- [ ] **Step 3: Verify in the dev server**

Run: `npm run dev`
Expected: load a PDF, the floating pill appears at the bottom-center with prev/next, page count, zoom controls, and a theme button. Page nav and zoom both work and re-render the page reactively.

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/components/ControlPill.svelte src/App.svelte
git commit -m "feat(ui): add ControlPill with page nav and zoom"
```

---

## Task 12: ThemePopover component

**Files:**
- Create: `src/components/ThemePopover.svelte`
- Modify: `src/components/ControlPill.svelte` (mount popover inside the pill for proper anchoring)

**Context:** A popover that opens above the theme button. Lives inside ControlPill so it can be positioned relative to the button using normal CSS, not ad-hoc fixed offsets. Lists all themes from doq-bridge. Clicking applies the theme instantly. Closes on outside click or Esc. Implements a basic focus trap and restores focus to the theme button on close.

- [ ] **Step 1: Implement `src/components/ThemePopover.svelte`**

```svelte
<script lang="ts">
  import { ui } from '$lib/stores/ui.svelte';
  import { listThemes, findThemeById, setActiveTheme } from '$lib/doq-bridge';
  import type { Theme } from '../types';

  let { triggerRef }: { triggerRef: HTMLButtonElement | null } = $props();

  const themes = listThemes();
  let popoverEl: HTMLDivElement | null = $state(null);
  let firstButtonEl: HTMLButtonElement | null = $state(null);

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
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Auto-focus the first item when the popover opens
  $effect(() => {
    if (ui.themePopoverOpen && firstButtonEl) {
      firstButtonEl.focus();
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
      {#each themes as theme, i (theme.id)}
        <button
          bind:this={firstButtonEl}
          class="pop-theme"
          class:selected={theme.id === ui.activeThemeId}
          role="option"
          aria-selected={theme.id === ui.activeThemeId}
          onclick={() => selectTheme(theme)}
          tabindex={i === 0 ? 0 : 0}
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
    /* Positioned by the parent ControlPill via absolute positioning relative
       to the theme button — see ControlPill's CSS in step 2. */
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
```

- [ ] **Step 2: Mount the popover INSIDE ControlPill (anchored to the theme button)**

In `src/components/ControlPill.svelte`, add the import:

```ts
  import ThemePopover from './ThemePopover.svelte';
```

Add a ref to capture the theme button element:

```ts
  let themeBtnRef: HTMLButtonElement | null = $state(null);
```

Modify the theme button to use `bind:this={themeBtnRef}`:

```svelte
    <button
      bind:this={themeBtnRef}
      class="pill-btn theme-btn"
      class:active={ui.themePopoverOpen}
      onclick={toggleThemePopover}
      aria-label="Theme picker"
      aria-expanded={ui.themePopoverOpen}
      aria-haspopup="dialog"
    >
```

Wrap the theme button in a positioning container and mount the popover inside it (so the popover is positioned relative to the button via CSS, not via ad-hoc JS math). Replace the existing `<button class="pill-btn theme-btn">…</button>` block with:

```svelte
    <div class="theme-anchor">
      <button
        bind:this={themeBtnRef}
        class="pill-btn theme-btn"
        class:active={ui.themePopoverOpen}
        onclick={toggleThemePopover}
        aria-label="Theme picker"
        aria-expanded={ui.themePopoverOpen}
        aria-haspopup="dialog"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"></circle>
          <circle cx="7.5" cy="10.5" r="1" fill="currentColor"></circle>
          <circle cx="12" cy="7.5" r="1" fill="currentColor"></circle>
          <circle cx="16.5" cy="10.5" r="1" fill="currentColor"></circle>
          <circle cx="14" cy="15.5" r="1" fill="currentColor"></circle>
        </svg>
      </button>
      <ThemePopover triggerRef={themeBtnRef} />
    </div>
```

Add CSS for `.theme-anchor` inside ControlPill's `<style>` block:

```css
  .theme-anchor {
    position: relative;
  }
```

The popover's CSS already uses `position: absolute; bottom: calc(100% + 12px); right: 0;` so it floats above the theme button anchored to the button's right edge. No more `translateX(35%)` magic numbers.

**Important: remove the `<ThemePopover />` element from `src/App.svelte`** if you added it earlier — it now lives inside ControlPill, not at the App level. The block in App.svelte should look like:

```svelte
  {:else if pdf.doc}
    <PageView />
    <ControlPill />
```

(No `<ThemePopover />` here anymore.)

- [ ] **Step 3: Verify in the dev server**

Run: `npm run dev`
Expected: Click the theme button in the pill — popover opens with the full theme list. Click a theme — the page re-renders with the new colors and the popover closes. Click outside or press Esc — popover closes.

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/components/ThemePopover.svelte src/App.svelte
git commit -m "feat(ui): add ThemePopover for picking dark themes"
```

---

## Task 13: Pill auto-hide

**Files:**
- Modify: `src/App.svelte`

**Context:** The pill auto-hides after 2.5 s of mouse inactivity and instantly fades back in on any movement. Implemented at the App level since it's a global mouse listener.

- [ ] **Step 1: Add the auto-hide logic to App.svelte**

Add this inside the existing `<script>` block in `src/App.svelte` (alongside the other handlers):

```ts
  let pillHideTimer: ReturnType<typeof setTimeout> | null = null;
  const PILL_IDLE_MS = 2500;

  function bumpPillVisibility(): void {
    ui.setPillVisible(true);
    if (pillHideTimer) clearTimeout(pillHideTimer);
    pillHideTimer = setTimeout(() => {
      // Don't hide if the popover is open
      if (!ui.themePopoverOpen) {
        ui.setPillVisible(false);
      }
    }, PILL_IDLE_MS);
  }
```

Add `onmousemove={bumpPillVisibility}` to the existing `<svelte:window>` element:

```svelte
<svelte:window
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onmousemove={bumpPillVisibility}
/>
```

- [ ] **Step 2: Add a fade transition to the pill**

Modify `src/components/ControlPill.svelte` — add the `fly` and `fade` import at the top of the script:

```ts
  import { fade } from 'svelte/transition';
```

Wrap the existing `<div class="pill">…</div>` with the transition by changing the opening tag:

```svelte
{#if ui.pillVisible}
  <div class="pill" transition:fade={{ duration: 200 }}>
    ...
  </div>
{/if}
```

- [ ] **Step 3: Verify in the dev server**

Run: `npm run dev`
Expected: load a PDF, the pill appears. Stop moving the mouse for ~3 seconds — the pill fades out. Move the mouse — it fades back in. Open the theme popover and stop moving — the pill stays visible.

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/App.svelte src/components/ControlPill.svelte
git commit -m "feat(ui): pill auto-hides after 2.5s idle"
```

---

## Task 14: Sidebar with thumbnails

**Files:**
- Create: `src/components/Sidebar.svelte`
- Create: `src/components/ThumbnailList.svelte`
- Create: `src/components/Thumbnail.svelte`

**Context:** The left sidebar shown when a PDF is loaded. Contains the app header, current filename, swap-file button, and a virtualized thumbnail list. Each thumbnail is rendered lazily when it scrolls into view (using `IntersectionObserver`). The current page has a blue highlight border. Clicking a thumbnail jumps to that page.

- [ ] **Step 1: Implement `src/components/Thumbnail.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { renderThumbnail } from '$lib/pdf/thumbnail';

  let { pageNumber }: { pageNumber: number } = $props();

  let container: HTMLButtonElement;
  let canvasHost: HTMLDivElement;
  let renderedCanvas = $state<HTMLCanvasElement | null>(null);
  let rendered = $state(false);

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !rendered) {
            void render();
          }
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(container);
    return () => observer.disconnect();
  });

  // Re-render the thumbnail when the active theme changes
  $effect(() => {
    void ui.activeThemeId;
    if (rendered && pdf.doc) {
      rendered = false;
      void render();
    }
  });

  // When a fresh canvas is rendered, swap it into the host via direct DOM
  // (no innerHTML — eliminates any XSS surface)
  $effect(() => {
    if (renderedCanvas && canvasHost) {
      canvasHost.replaceChildren(renderedCanvas);
    }
  });

  async function render(): Promise<void> {
    if (!pdf.doc) return;
    try {
      const page = await pdf.doc.getPage(pageNumber);
      const c = document.createElement('canvas');
      await renderThumbnail(page, c);
      renderedCanvas = c;
      rendered = true;
    } catch (err) {
      console.error(`Failed to render thumb ${pageNumber}`, err);
    }
  }

  function handleClick(): void {
    pdf.goToPage(pageNumber);
  }
</script>

<button
  bind:this={container}
  class="thumb"
  class:current={pdf.currentPage === pageNumber}
  onclick={handleClick}
  aria-label={`Go to page ${pageNumber}`}
  aria-current={pdf.currentPage === pageNumber ? 'page' : undefined}
>
  <div class="canvas-host" bind:this={canvasHost}>
    {#if !renderedCanvas}
      <div class="placeholder"></div>
    {/if}
  </div>
  <div class="num">{pageNumber}</div>
</button>

<style>
  .thumb {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px;
    cursor: pointer;
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 4;
    transition: border-color 120ms ease;
    overflow: hidden;
  }

  .thumb:hover {
    border-color: rgba(106, 169, 255, 0.5);
  }

  .thumb.current {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .canvas-host {
    width: 100%;
    height: 100%;
  }

  .canvas-host :global(canvas) {
    display: block;
    width: 100%;
    height: auto;
  }

  .placeholder {
    background: rgba(255, 255, 255, 0.02);
    width: 100%;
    height: 100%;
    border-radius: 2px;
  }

  .num {
    position: absolute;
    bottom: 4px;
    right: 6px;
    color: var(--text-faint);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    background: rgba(0, 0, 0, 0.6);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
```

**Note on no innerHTML:** the canvas is created in JS and inserted via `replaceChildren`. No `{@html}` directive anywhere — keeps the XSS surface at zero.

- [ ] **Step 2: Implement `src/components/ThumbnailList.svelte`**

```svelte
<script lang="ts">
  import Thumbnail from './Thumbnail.svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
</script>

<div class="thumb-list">
  {#each Array.from({ length: pdf.numPages }, (_, i) => i + 1) as n (n)}
    <Thumbnail pageNumber={n} />
  {/each}
</div>

<style>
  .thumb-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px;
  }
</style>
```

- [ ] **Step 3: Implement `src/components/Sidebar.svelte`**

```svelte
<script lang="ts">
  import ThumbnailList from './ThumbnailList.svelte';
  import { pdf } from '$lib/stores/pdf.svelte';

  let { onSwapFile }: { onSwapFile: () => void } = $props();
</script>

<aside class="sidebar">
  <header class="header">
    <div class="app-row">
      <div class="logo"></div>
      <div class="name">PDF Dark</div>
    </div>
    <div class="filename-row">
      <span class="filename" title={pdf.filename}>{pdf.filename}</span>
      <button class="swap-btn" onclick={onSwapFile} aria-label="Open a different PDF">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 3h5v5"></path>
          <path d="M21 3l-7 7"></path>
          <path d="M8 21H3v-5"></path>
          <path d="M3 21l7-7"></path>
        </svg>
      </button>
    </div>
  </header>

  <div class="pages-label">Pages</div>
  <div class="thumbs-scroll">
    <ThumbnailList />
  </div>
</aside>

<style>
  .sidebar {
    width: 200px;
    background: var(--panel);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    /* NOTE: do NOT set overflow:hidden here — the collapse chevron in Task 15
       intentionally extends past the right edge with right:-10px and would be
       clipped. Scrolling for the thumbnail list is on .thumbs-scroll only. */
    position: relative;
  }

  .header {
    padding: 14px 14px 12px 14px;
    border-bottom: 1px solid #1f1f24;
  }

  .app-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo {
    width: 22px;
    height: 22px;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    border-radius: 5px;
  }

  .name {
    color: var(--text);
    font-size: 12px;
    font-weight: 600;
  }

  .filename-row {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filename {
    color: var(--text-dim);
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .swap-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 120ms ease, color 120ms ease;
  }

  .swap-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
  }

  .pages-label {
    padding: 12px 14px 8px 14px;
    color: var(--text-faint);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .thumbs-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px 16px 8px;
  }

  /* Responsive baseline: on narrow viewports the sidebar becomes a drawer
     overlay so it doesn't eat half the screen on a phone. The reader is not
     mobile-OPTIMIZED in v1 but it should at least not be broken. */
  @media (max-width: 720px) {
    .sidebar {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      width: min(85vw, 280px);
      z-index: 150;
      box-shadow: 8px 0 24px rgba(0, 0, 0, 0.6);
    }
  }
</style>
```

- [ ] **Step 4: Mount the sidebar in App.svelte**

In `src/App.svelte`, add the import:

```ts
  import Sidebar from './components/Sidebar.svelte';
```

And modify the reader block to include the sidebar and a reader layout container. Replace the `{:else if pdf.doc}` block with:

```svelte
  {:else if pdf.doc}
    <Sidebar onSwapFile={() => fileInputForSwap.click()} />
    <PageView />
    <ControlPill />
    <input
      bind:this={fileInputForSwap}
      type="file"
      accept="application/pdf,.pdf"
      onchange={handleSwapFileChange}
      hidden
    />
```

And add to the script:

```ts
  let fileInputForSwap: HTMLInputElement;

  function handleSwapFileChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) void handleFile(file);
    target.value = '';
  }
```

- [ ] **Step 5: Verify in the dev server**

Run: `npm run dev`
Expected: load a PDF — sidebar appears on the left with app logo, filename, swap icon, and a list of thumbnails that lazily render as you scroll. Current page is highlighted blue. Click a thumbnail to jump to that page. Click the swap icon to open a new file.

Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add src/components/Sidebar.svelte src/components/ThumbnailList.svelte src/components/Thumbnail.svelte src/App.svelte
git commit -m "feat(ui): add sidebar with virtualized thumbnails"
```

---

## Task 15: Sidebar collapse

**Files:**
- Modify: `src/components/Sidebar.svelte`
- Modify: `src/App.svelte`

**Context:** Toggle the sidebar fully closed via `⌘\` (handled in Task 18) or a chevron button at the right edge of the sidebar. State persists to localStorage. In the empty state, the sidebar is hidden entirely regardless.

- [ ] **Step 1: Add a chevron toggle to the sidebar**

In `src/components/Sidebar.svelte`, add the chevron button at the end of the `<aside>`:

```svelte
<aside class="sidebar">
  <!-- ...existing header, pages-label, thumbs-scroll... -->

  <button class="collapse-btn" onclick={() => ui.toggleSidebar()} aria-label="Collapse sidebar">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  </button>
</aside>
```

Add the import at the top of the script:

```ts
  import { ui } from '$lib/stores/ui.svelte';
```

Add CSS for the collapse button (inside the existing `<style>`):

```css
  .collapse-btn {
    position: absolute;
    top: 50%;
    right: -10px;
    transform: translateY(-50%);
    width: 20px;
    height: 36px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0 6px 6px 0;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: background 120ms ease, color 120ms ease;
  }

  .collapse-btn:hover {
    background: var(--panel-2);
    color: var(--text);
  }
```

Note: `.sidebar` already has `position: relative` from Task 14 (it was added there with the comment about not setting overflow:hidden so this chevron isn't clipped). No further change needed.

- [ ] **Step 2: Conditionally render the sidebar in App.svelte**

Modify the `{:else if pdf.doc}` block in `src/App.svelte`:

```svelte
  {:else if pdf.doc}
    {#if !ui.sidebarCollapsed}
      <Sidebar onSwapFile={() => fileInputForSwap.click()} />
    {/if}
    <PageView />
    <ControlPill />
    <ThemePopover />
    <input
      bind:this={fileInputForSwap}
      type="file"
      accept="application/pdf,.pdf"
      onchange={handleSwapFileChange}
      hidden
    />
```

- [ ] **Step 3: Add a slide transition to the sidebar**

In `src/components/Sidebar.svelte`, add the import:

```ts
  import { fly } from 'svelte/transition';
```

Wrap the `<aside>` opening tag with the transition:

```svelte
<aside class="sidebar" transition:fly={{ x: -200, duration: 250 }}>
```

- [ ] **Step 4: Verify in the dev server**

Run: `npm run dev`
Expected: load a PDF. Click the chevron at the right edge of the sidebar — sidebar slides out. Click anywhere... wait, we have no expand button when collapsed. We need a "show sidebar" hint when collapsed. Let me add it.

- [ ] **Step 5: Add an expand button when sidebar is collapsed**

In `src/App.svelte`, add inside the `{:else if pdf.doc}` block (after the conditional sidebar):

```svelte
    {#if !ui.sidebarCollapsed}
      <Sidebar onSwapFile={() => fileInputForSwap.click()} />
      <!-- Backdrop only appears at narrow viewports (CSS-controlled) so the
           sidebar drawer can be dismissed by tapping outside on mobile. -->
      <button
        class="sidebar-backdrop"
        aria-label="Close sidebar"
        onclick={() => ui.setSidebarCollapsed(true)}
      ></button>
    {:else}
      <button
        class="expand-sidebar-btn"
        onclick={() => ui.setSidebarCollapsed(false)}
        aria-label="Show sidebar"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    {/if}
```

Add the CSS for the expand button to App.svelte's `<style>`:

```css
  :global(.expand-sidebar-btn) {
    position: fixed;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    width: 18px;
    height: 36px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-left: none;
    border-radius: 0 6px 6px 0;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 90;
    transition: background 120ms ease, color 120ms ease;
  }

  :global(.expand-sidebar-btn):hover {
    background: var(--panel-2);
    color: var(--text);
  }

  /* Backdrop for the sidebar drawer at narrow viewports. Hidden on desktop. */
  :global(.sidebar-backdrop) {
    display: none;
  }
  @media (max-width: 720px) {
    :global(.sidebar-backdrop) {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 140;
      border: none;
      cursor: pointer;
    }
  }
```

- [ ] **Step 6: Verify in the dev server**

Run: `npm run dev`
Expected: load a PDF. Click the chevron — sidebar slides out. A small expand chevron appears at the left edge — click it to bring the sidebar back. Reload the page — collapsed state persists.

Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add src/components/Sidebar.svelte src/App.svelte
git commit -m "feat(ui): sidebar collapse toggle with persistence"
```

---

## Task 16: Loading state

**Files:**
- Create: `src/components/LoadingOverlay.svelte`
- Modify: `src/App.svelte`

**Context:** When `pdf.loadingState` is `'reading-file'`, `'parsing'`, or `'rendering'` AND we've been loading for more than ~300 ms, show a subtle overlay with a spinner and the current step.

- [ ] **Step 1: Implement `src/components/LoadingOverlay.svelte`**

```svelte
<script lang="ts">
  import { pdf } from '$lib/stores/pdf.svelte';

  const SHOW_AFTER_MS = 300;
  const stepLabels: Record<string, string> = {
    'reading-file': 'Reading file',
    'parsing': 'Parsing PDF',
    'rendering': 'Rendering page'
  };

  let visible = $state(false);
  let loadingStartedAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    const state = pdf.loadingState;
    const isLoading = state === 'reading-file' || state === 'parsing' || state === 'rendering';

    if (!isLoading) {
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
    background: rgba(15, 15, 16, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
  }

  .card {
    background: var(--panel);
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
```

- [ ] **Step 2: Mount the overlay in App.svelte**

Add the import:

```ts
  import LoadingOverlay from './components/LoadingOverlay.svelte';
```

Add `<LoadingOverlay />` at the top level of the markup, just inside `<main class="app">`:

```svelte
<main class="app">
  <LoadingOverlay />
  {#if !doqReady}
    ...
  {/if}
</main>
```

- [ ] **Step 3: Verify**

Run: `npm run dev`
Expected: drop a larger PDF (10+ MB if you have one). The loading overlay appears briefly with "Parsing PDF…" then disappears once the first page renders. For tiny PDFs the overlay never appears (because parsing finishes in < 300 ms).

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/components/LoadingOverlay.svelte src/App.svelte
git commit -m "feat(ui): add loading overlay with 300ms delay"
```

---

## Task 17: Error handling

**Files:**
- Create: `src/components/ErrorOverlay.svelte`
- Modify: `src/App.svelte`

**Context:** When `pdf.loadingState === 'error'`, show a clean error message with a "Try another PDF" button that returns to the empty state.

- [ ] **Step 1: Implement `src/components/ErrorOverlay.svelte`**

```svelte
<script lang="ts">
  import { pdf } from '$lib/stores/pdf.svelte';

  function handleReset(): void {
    pdf.reset();
  }
</script>

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
    background: rgba(15, 15, 16, 0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 400;
  }

  .card {
    background: var(--panel);
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
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease;
  }

  .reset-btn:hover {
    background: #2a2a2f;
    border-color: var(--accent);
  }
</style>
```

- [ ] **Step 2: Mount the overlay in App.svelte**

Add the import:

```ts
  import ErrorOverlay from './components/ErrorOverlay.svelte';
```

Add `<ErrorOverlay />` next to `<LoadingOverlay />`:

```svelte
<main class="app">
  <LoadingOverlay />
  <ErrorOverlay />
  ...
</main>
```

- [ ] **Step 3: Verify error handling**

Run: `npm run dev`
Drop a non-PDF file (like a `.txt`) onto the window. Expected: error overlay appears with "That's not a PDF: …" and a "Try another PDF" button. Click it — back to the empty state.

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/components/ErrorOverlay.svelte src/App.svelte
git commit -m "feat(ui): add error overlay for PDF load failures"
```

---

## Task 18: Global keyboard shortcuts

**Files:**
- Create: `src/lib/keyboard.ts`
- Test: `tests/lib/keyboard.test.ts`
- Modify: `src/App.svelte`

**Context:** Single global keyboard handler with all the shortcuts from the spec (§4.7).

- [ ] **Step 1: Write the failing test**

Create `tests/lib/keyboard.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';

describe('keyboard', () => {
  it('matchShortcut returns true for matching key combos', async () => {
    const { matchShortcut } = await import('../../src/lib/keyboard');
    const evt = new KeyboardEvent('keydown', { key: 'o', metaKey: true });
    expect(matchShortcut(evt, { key: 'o', meta: true })).toBe(true);
  });

  it('matchShortcut accepts ctrl as meta on non-mac', async () => {
    const { matchShortcut } = await import('../../src/lib/keyboard');
    const evt = new KeyboardEvent('keydown', { key: 'o', ctrlKey: true });
    expect(matchShortcut(evt, { key: 'o', meta: true })).toBe(true);
  });

  it('matchShortcut respects key case-insensitively', async () => {
    const { matchShortcut } = await import('../../src/lib/keyboard');
    const evt = new KeyboardEvent('keydown', { key: 'O', metaKey: true });
    expect(matchShortcut(evt, { key: 'o', meta: true })).toBe(true);
  });

  it('matchShortcut returns false when modifier missing', async () => {
    const { matchShortcut } = await import('../../src/lib/keyboard');
    const evt = new KeyboardEvent('keydown', { key: 'o' });
    expect(matchShortcut(evt, { key: 'o', meta: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — keyboard module not found.

- [ ] **Step 3: Implement `src/lib/keyboard.ts`**

```ts
export interface ShortcutSpec {
  key: string;
  meta?: boolean;
  shift?: boolean;
}

/** Returns true if the keyboard event matches the shortcut. Cmd on Mac, Ctrl elsewhere. */
export function matchShortcut(evt: KeyboardEvent, spec: ShortcutSpec): boolean {
  if (evt.key.toLowerCase() !== spec.key.toLowerCase()) return false;
  if (spec.meta && !(evt.metaKey || evt.ctrlKey)) return false;
  if (!spec.meta && (evt.metaKey || evt.ctrlKey)) return false;
  if (spec.shift && !evt.shiftKey) return false;
  return true;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, all keyboard tests green.

- [ ] **Step 5: Wire shortcuts into App.svelte**

In `src/App.svelte`, add the import:

```ts
  import { matchShortcut } from '$lib/keyboard';
```

Add a single handler:

```ts
  function handleGlobalKey(e: KeyboardEvent): void {
    // Open file picker
    if (matchShortcut(e, { key: 'o', meta: true })) {
      e.preventDefault();
      if (pdf.doc) {
        fileInputForSwap.click();
      } else {
        // Empty state — emit a custom event the EmptyState listens to,
        // OR re-use the swap input. Simpler: always use the swap input.
        fileInputForSwap.click();
      }
      return;
    }

    // Toggle sidebar (only if a PDF is loaded)
    if (matchShortcut(e, { key: '\\', meta: true })) {
      e.preventDefault();
      if (pdf.doc) ui.toggleSidebar();
      return;
    }

    // Page navigation
    if (e.key === 'ArrowRight' && pdf.doc) {
      pdf.nextPage();
      return;
    }
    if (e.key === 'ArrowLeft' && pdf.doc) {
      pdf.prevPage();
      return;
    }

    // Zoom
    if ((e.key === '+' || e.key === '=') && pdf.doc) {
      e.preventDefault();
      ui.zoomIn();
      return;
    }
    if (e.key === '-' && pdf.doc) {
      e.preventDefault();
      ui.zoomOut();
      return;
    }
    if (e.key === '0' && pdf.doc) {
      e.preventDefault();
      ui.resetZoom();
      return;
    }
  }
```

Add `onkeydown={handleGlobalKey}` to the existing `<svelte:window>` element.

Move the swap file input out of the conditional block so it exists in both empty and reader states:

```svelte
<input
  bind:this={fileInputForSwap}
  type="file"
  accept="application/pdf,.pdf"
  onchange={handleSwapFileChange}
  hidden
/>

<main class="app">
  ...
</main>
```

- [ ] **Step 6: Verify in the dev server**

Run: `npm run dev`
Expected:
- Press `⌘O` from the empty state — file picker opens.
- Load a PDF, press `⌘O` again — file picker opens to swap.
- Press `⌘\` — sidebar collapses.
- Arrow keys navigate pages.
- `+` / `-` / `0` adjust zoom.

Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add src/lib/keyboard.ts tests/lib/keyboard.test.ts src/App.svelte
git commit -m "feat: global keyboard shortcuts (⌘O, ⌘\\, arrows, +/-, 0)"
```

---

## Task 18.5: Component smoke tests

**Files:**
- Create: `tests/components/EmptyState.test.ts`
- Create: `tests/components/ControlPill.test.ts`
- Create: `tests/components/ThemePopover.test.ts`
- Create: `tests/components/Sidebar.test.ts`
- Create: `tests/components/LoadingOverlay.test.ts`
- Create: `tests/components/ErrorOverlay.test.ts`

**Context:** Cheap smoke tests using `@testing-library/svelte`. Each test mounts a component and verifies it renders the expected initial markup, then exercises one or two key state transitions. We do NOT test pixel rendering, animation timing, or third-party libraries — just that our components react correctly to store changes.

These tests would have caught the contradictory Thumbnail.svelte bug from the adversarial review and will catch similar regressions in the future.

- [ ] **Step 1: EmptyState test**

Create `tests/components/EmptyState.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import EmptyState from '../../src/components/EmptyState.svelte';

describe('EmptyState', () => {
  it('mounts with the headline target text and hint', () => {
    const onFileSelected = vi.fn();
    render(EmptyState, { props: { onFileSelected } });
    // Hint text is rendered immediately (typewriter doesn't affect this)
    expect(screen.getByText(/Drop in a PDF to start/i)).toBeTruthy();
    expect(screen.getByText(/⌘O/i)).toBeTruthy();
  });

  it('exposes the drop zone as a clickable button', () => {
    const onFileSelected = vi.fn();
    render(EmptyState, { props: { onFileSelected } });
    const dropZone = screen.getByRole('button', { name: /open a pdf file/i });
    expect(dropZone).toBeTruthy();
  });

  it('calls onFileSelected when a file is chosen via the input', async () => {
    const onFileSelected = vi.fn();
    const { container } = render(EmptyState, { props: { onFileSelected } });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file] });
    await fireEvent.change(input);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });
});
```

- [ ] **Step 2: ControlPill test**

Create `tests/components/ControlPill.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ControlPill from '../../src/components/ControlPill.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';
import { ui } from '../../src/lib/stores/ui.svelte';

beforeEach(() => {
  pdf.reset();
  ui.reset();
  pdf.setDocument({ numPages: 32 } as any, 'test.pdf');
});

describe('ControlPill', () => {
  it('mounts and shows current page / total', () => {
    render(ControlPill);
    expect(screen.getByText('1 / 32')).toBeTruthy();
  });

  it('disables the prev button on page 1 and the next button on the last page', () => {
    render(ControlPill);
    const prev = screen.getByRole('button', { name: /previous page/i }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    pdf.goToPage(32);
    const next = screen.getByRole('button', { name: /next page/i }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it('shows the current zoom percent', () => {
    render(ControlPill);
    expect(screen.getByText('100%')).toBeTruthy();
    ui.zoomIn();
    expect(screen.getByText('125%')).toBeTruthy();
  });

  it('clicking the theme button toggles the popover open state', async () => {
    render(ControlPill);
    const themeBtn = screen.getByRole('button', { name: /theme picker/i });
    expect(ui.themePopoverOpen).toBe(false);
    await fireEvent.click(themeBtn);
    expect(ui.themePopoverOpen).toBe(true);
  });
});
```

- [ ] **Step 3: ThemePopover test**

Create `tests/components/ThemePopover.test.ts`:

```ts
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ThemePopover from '../../src/components/ThemePopover.svelte';
import { ui } from '../../src/lib/stores/ui.svelte';
import colorsData from '../../src/lib/doq/colors.json';

beforeAll(() => {
  // @ts-expect-error - mocking global fetch for doq init
  globalThis.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(colorsData) }));
});

beforeEach(async () => {
  ui.reset();
  const { initDoq } = await import('../../src/lib/doq-bridge');
  await initDoq();
});

describe('ThemePopover', () => {
  it('renders nothing when popover is closed', () => {
    const { container } = render(ThemePopover, { props: { triggerRef: null } });
    expect(container.querySelector('.theme-popover')).toBeNull();
  });

  it('renders the theme list when open', () => {
    ui.setThemePopoverOpen(true);
    render(ThemePopover, { props: { triggerRef: null } });
    expect(screen.getByRole('dialog', { name: /theme picker/i })).toBeTruthy();
    // At least one theme option visible
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Sidebar test**

Create `tests/components/Sidebar.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Sidebar from '../../src/components/Sidebar.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';
import { ui } from '../../src/lib/stores/ui.svelte';

beforeEach(() => {
  pdf.reset();
  ui.reset();
  pdf.setDocument({ numPages: 5 } as any, 'my-paper.pdf');
});

describe('Sidebar', () => {
  it('mounts with app name and filename', () => {
    render(Sidebar, { props: { onSwapFile: () => {} } });
    expect(screen.getByText('PDF Dark')).toBeTruthy();
    expect(screen.getByText('my-paper.pdf')).toBeTruthy();
  });

  it('calls onSwapFile when the swap button is clicked', async () => {
    const onSwapFile = vi.fn();
    render(Sidebar, { props: { onSwapFile } });
    const swapBtn = screen.getByRole('button', { name: /open a different pdf/i });
    await fireEvent.click(swapBtn);
    expect(onSwapFile).toHaveBeenCalledOnce();
  });

  it('toggles sidebar via the collapse chevron', async () => {
    render(Sidebar, { props: { onSwapFile: () => {} } });
    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
    expect(ui.sidebarCollapsed).toBe(false);
    await fireEvent.click(collapseBtn);
    expect(ui.sidebarCollapsed).toBe(true);
  });
});
```

- [ ] **Step 5: LoadingOverlay test**

Create `tests/components/LoadingOverlay.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import LoadingOverlay from '../../src/components/LoadingOverlay.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';

beforeEach(() => {
  vi.useFakeTimers();
  pdf.reset();
});

describe('LoadingOverlay', () => {
  it('does not render when idle', () => {
    const { container } = render(LoadingOverlay);
    expect(container.querySelector('.overlay')).toBeNull();
  });

  it('appears after the 300ms threshold during loading', async () => {
    pdf.setLoading('parsing');
    const { container } = render(LoadingOverlay);
    // Not visible immediately
    expect(container.querySelector('.overlay')).toBeNull();
    // Advance past the threshold
    vi.advanceTimersByTime(350);
    await waitFor(() => {
      expect(container.querySelector('.overlay')).toBeTruthy();
    });
  });

  it('hides when loadingState returns to ready', async () => {
    pdf.setLoading('parsing');
    const { container } = render(LoadingOverlay);
    vi.advanceTimersByTime(350);
    await waitFor(() => expect(container.querySelector('.overlay')).toBeTruthy());
    pdf.setDocument({ numPages: 1 } as any, 'a.pdf');
    await waitFor(() => expect(container.querySelector('.overlay')).toBeNull());
  });
});
```

- [ ] **Step 6: ErrorOverlay test**

Create `tests/components/ErrorOverlay.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ErrorOverlay from '../../src/components/ErrorOverlay.svelte';
import { pdf } from '../../src/lib/stores/pdf.svelte';

beforeEach(() => {
  pdf.reset();
});

describe('ErrorOverlay', () => {
  it('does not render when there is no error', () => {
    const { container } = render(ErrorOverlay);
    expect(container.querySelector('.overlay')).toBeNull();
  });

  it('renders the error message and a reset button when in error state', () => {
    pdf.setError('boom');
    render(ErrorOverlay);
    expect(screen.getByText('boom')).toBeTruthy();
    expect(screen.getByRole('button', { name: /try another pdf/i })).toBeTruthy();
  });

  it('reset button returns the store to idle', async () => {
    pdf.setError('boom');
    render(ErrorOverlay);
    const btn = screen.getByRole('button', { name: /try another pdf/i });
    await fireEvent.click(btn);
    expect(pdf.loadingState).toBe('idle');
  });
});
```

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: All component tests pass alongside the existing unit tests. Total should be ~25–30 tests green.

- [ ] **Step 8: Commit**

```bash
git add tests/components
git commit -m "test: smoke tests for EmptyState, ControlPill, ThemePopover, Sidebar, LoadingOverlay, ErrorOverlay"
```

---

## Task 19: Polish, build verification, and cleanup

**Files:**
- Create: `public/favicon.svg`
- Create: `README.md`
- Modify: `src/App.svelte` (drag overlay)
- Create: `src/components/DragOverlay.svelte`
- Delete: `prototype/`

**Context:** Last pass — visible drag highlight, favicon, README, production build, and remove the throwaway prototype directory.

- [ ] **Step 1: Implement `src/components/DragOverlay.svelte`**

```svelte
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
```

- [ ] **Step 2: Mount the drag overlay in App.svelte**

Add the import:

```ts
  import DragOverlay from './components/DragOverlay.svelte';
```

Add `<DragOverlay />` in the markup, next to the other overlays:

```svelte
<main class="app">
  <LoadingOverlay />
  <ErrorOverlay />
  <DragOverlay />
  ...
</main>
```

- [ ] **Step 3: Create `public/favicon.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6aa9ff"/>
      <stop offset="100%" stop-color="#b894ff"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path d="M44 32a12 12 0 1 1-13.5-12 9 9 0 0 0 13.5 12z" fill="#0f0f10"/>
</svg>
```

- [ ] **Step 4: Create `README.md`**

```markdown
# PDF Dark

A web app that lets you drop a PDF and read it in genuinely good dark mode. Zero login. Zero upload. Everything happens in your browser.

**Tagline:** *Made for night reading.*

## What makes it different

Most "PDF dark mode" tools (browser extensions, CSS filter hacks) destroy image colors and produce muddy, low-contrast output. We use a perceptually-uniform CIELAB color transformation via [doq](https://github.com/shivaprsd/doq) (vendored in `src/lib/doq/`) that preserves image content and produces text that's genuinely pleasant to read.

## Tech stack

- [Svelte 5](https://svelte.dev) (runes) + TypeScript
- [Vite](https://vitejs.dev) for dev/build
- [pdfjs-dist](https://github.com/mozilla/pdf.js) for PDF parsing/rendering
- [doq](https://github.com/shivaprsd/doq) (MIT, vendored) for CIELAB color transformation

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run check    # svelte-check
npm run build    # production build
```

## Acknowledgments

- **doq** © shivaprsd — MIT license. Vendored in `src/lib/doq/`.
- **pdfjs-dist** © Mozilla — Apache 2.0.

## License

MIT
```

- [ ] **Step 5: Run a production build**

Run: `npm run build`
Expected: Vite builds to `dist/` without errors. Look at the output sizes — the JS bundle should be under ~500 KB compressed. If it's larger, that's a regression worth investigating but not a blocker for committing.

- [ ] **Step 6: Preview the production build**

Run: `npm run preview`
Expected: a local preview server starts. Open it, load a PDF, verify everything works in production mode (no dev errors, no missing assets).

Stop with Ctrl+C.

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 8: Run type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 9: Remove the throwaway prototype (uses git rm so the deletion is staged in one step)**

```bash
git rm -r prototype
```

Expected: removes `prototype/` from disk AND stages the deletion. Equivalent to `rm -rf prototype/ && git add -A prototype/`.

- [ ] **Step 10: Commit final polish**

```bash
git add public/favicon.svg README.md src/App.svelte src/components/DragOverlay.svelte
git commit -m "feat: drag overlay, favicon, README; remove prototype spike"
```

---

## Out of scope (deferred to v1.5+)

The following are intentionally NOT in this plan, per the spec:

- Search within PDFs
- Text selection / copy
- Mobile-optimized UX
- Annotations, highlights, bookmarks, saved library
- Multiple PDFs open simultaneously
- Print
- Light mode toggle
- OCR for scanned PDFs
- Cloud sync, accounts, history

When you tackle v1.5, the first task should be the PDF text layer (`src/lib/pdf/text-layer.ts`) — search, text selection, and copy all build on top of it.

---

## Adversarial review patches applied (2026-04-08)

After writing the initial plan, an adversarial review surfaced 14 issues across critical, high, and medium severity. All have been patched in-place. Summary:

**Critical (3) — would have failed at execution time:**
1. ✅ Task 14 Step 1 had two contradictory Thumbnail.svelte versions; consolidated to a single safe version using `bind:this={canvasHost}` + `replaceChildren` (zero innerHTML, zero `{@html}`)
2. ✅ Task 14 Sidebar `overflow: hidden` would have clipped the Task 15 collapse chevron; removed and added a comment explaining why; scrolling moved to `.thumbs-scroll`
3. ✅ Task 19 `git rm` sequence was broken (rm then git rm a missing dir); collapsed to a single `git rm -r prototype` command

**High (5) — would have failed at runtime:**
4. ✅ Task 3 PDF error classification now uses `instanceof PasswordException`/etc. from pdfjs-dist instead of brittle regex on err.message; mock updated to provide stub exception classes
5. ✅ Task 4 `transform: null` replaced with conditional spread; test expectation updated to `toBeUndefined()`
6. ✅ Task 1 added `vitest-canvas-mock` dependency and imported it in `tests/setup.ts` so happy-dom's incomplete canvas stub doesn't break renderer/thumbnail tests
7. ✅ Tasks 9 + 10 added a theme fallback chain: stored ID → 'Firefox/Dark' → first available → null. Prevents crashes when localStorage has a stale theme ID.
8. ✅ Task 9 PageView now shows a per-page render error placeholder (per spec §9) instead of silently leaving the previous canvas in place

**Medium (6):**
9. ✅ Tasks 7 + 11 introduced `canZoomIn`/`canZoomOut` derived states in the ui store; ControlPill uses them instead of hardcoded `=== 7` index check; ui store test extended
10. ✅ Task 10 `handleFile` now uses `loadPdfFromBuffer` directly with awaits between `setLoading('reading-file')` → `file.arrayBuffer()` → `setLoading('parsing')` so the reading-file state is actually observable
11. ✅ Task 12 ThemePopover restructured: now lives INSIDE ControlPill anchored to a `.theme-anchor` positioning container with `position: absolute; bottom: calc(100% + 12px); right: 0;` (no more ad-hoc `translateX(35%)`). Added focus trap, focus restoration to trigger button on close, `aria-haspopup`, `aria-expanded`, listbox semantics
12. ✅ Task 16 LoadingOverlay timer now anchors to an absolute `loadingStartedAt` timestamp so the 300 ms threshold isn't reset on every state transition
13. ✅ Spec Goals updated to include baseline accessibility (focus management, ARIA, aria-live page announcements) and responsive baseline; non-goals clarified to distinguish "mobile-OPTIMIZED" from "responsive baseline"
14. ✅ Task 14 added a `@media (max-width: 720px)` block making the sidebar a drawer overlay on narrow viewports; Task 15 added a CSS-controlled backdrop that's only visible at narrow viewports

**Low (acknowledged, not patched):** annots.js/utils.js dead code from doq vendoring (~3 KB), no CI config, no component smoke tests, no manual visual regression check post-build. These are tracked but not blockers for v1.

---

## Plan self-review

### Spec coverage

- ✅ §1 Overview / tagline → implicit in README and EmptyState (Task 8)
- ✅ §2 Goals → all in v1 plan; non-goals explicitly excluded
- ✅ §3.1-3.2 Architecture (client-side, why) → Task 2-4 (doq, loader, renderer)
- ✅ §3.3 Tech stack → Task 1 (scaffold)
- ✅ §4.1 Layout shape → Task 14 (Sidebar) + Task 11 (ControlPill)
- ✅ §4.2 Empty state (sidebar hidden, typewriter, subtitle outside box) → Task 8 + Task 10 (App routing)
- ✅ §4.3 Reading state (thumbnails, pill, popover, collapse, swap file) → Tasks 11, 12, 14, 15
- ✅ §4.4 Loading state (>300ms threshold) → Task 16
- ✅ §4.5 Drag-over visual → Task 19 (DragOverlay)
- ✅ §4.6 Default zoom 100% = scale 1.5 → Task 7 (ui store BASE_SCALE)
- ✅ §4.7 Keyboard shortcuts → Task 18
- ✅ §5 Component breakdown → matches Task 8-19 file paths
- ✅ §6.1 State / two stores → Task 7
- ✅ §6.2 Drop-to-render flow → Task 10 (App handleFile)
- ✅ §6.3 Page change flow → Task 9 (PageView reactivity)
- ✅ §6.4 Theme change flow → Task 12 (ThemePopover) + Task 14 (Thumbnail re-render on theme change)
- ✅ §7 doq integration (vendoring, mechanism, multi-word bug workaround) → Task 2
- ✅ §8 Performance → no explicit task, but high-DPI rendering (Task 4) and lazy thumbnails (Task 14) implement the relevant optimizations
- ✅ §9 Error handling → Tasks 3 (PdfLoadError) + 17 (ErrorOverlay)
- ✅ §10 Browser compatibility → Vite default targets are ES2020+; no special handling required
- ✅ §11 Sample PDFs → not in v1 plan, marked as deferred decision in spec §13
- ✅ §12 Hosting → not in v1 plan, marked as deferred decision in spec §13
- ✅ §15 Attribution → README in Task 19

**Gaps found and addressed:** No spec requirements without a task. The "open questions" in spec §13 (loading visual specifics, drag-over specifics, brand colors, favicon, hosting, sample PDFs) are intentionally deferred — Task 16, 19, and the favicon use placeholder values that match the spec's intent.

### Placeholder scan

- No "TBD", "TODO", or "implement later" steps
- Every code step has actual code, not "add appropriate handling"
- Every test step has actual test code
- Every command step has the exact command and expected output

### Type consistency check

- `Theme` type defined in Task 2 (`src/types.ts`) and used consistently in Task 7 (ui store), Task 9 (PageView), Task 12 (ThemePopover), Task 14 (Thumbnail re-render)
- `LoadingState` enum defined in Task 2, used in Task 7 (pdf store) and Task 16 (LoadingOverlay)
- `PdfLoadError` defined in Task 3, used in Task 10 (App handleFile)
- `setActiveTheme(theme: Theme)` signature: Task 2 defines it, Task 9/12 call it correctly with a `Theme` argument
- `ZOOM_LEVELS`, `BASE_SCALE` exported from `src/lib/stores/ui.svelte.ts` in Task 7, used in tests and consumed by `ui.zoomIn`/`zoomOut`/`effectiveScale`
- `pdf.goToPage(n)`, `pdf.nextPage()`, `pdf.prevPage()` consistent across Task 7 (definition), Task 11 (ControlPill calls), Task 14 (Thumbnail click), Task 18 (keyboard handler)
- `ui.toggleSidebar()` defined in Task 7, used in Task 15 (Sidebar chevron) and Task 18 (keyboard handler)

No inconsistencies found.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-07-pdf-dark-reader.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for keeping the main context clean across 19 tasks.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Best if you want to watch each step land in real time.

**Which approach?**
