# PDF Dark Mode — Phase 2 Prototype (Research Spike)

**This is throwaway research code, not the actual product.** Its only purpose is to validate that `pdfjs-dist + vendored doq` produces excellent dark mode rendering at acceptable performance, before committing to the full design.

## What it does

- Loads a user-supplied PDF entirely in the browser via `pdfjs-dist`
- Renders the same page twice: once with default colors, once with `doq`'s CIELAB color transformation applied
- Side-by-side display for visual quality comparison
- Measures and reports render timings + overhead percentage
- Lets you switch between doq's bundled color schemes (Solarized Dark, Nord Polar Night, etc.)

## What it does NOT do

- No bundler, no build step, no framework — single HTML file with `<script type="module">`
- No drag-and-drop UI (use the file picker)
- No PDF page virtualization, no sidebar, no text selection — those come in the real product
- Not styled for production

## How to run

From the repo root:

```bash
cd prototype
python3 -m http.server 8765
```

Then open <http://localhost:8765/> in your browser.

A local HTTP server is required because ES modules can't be loaded from `file://` URLs.

## How to use

1. Open the page in your browser
2. Pick a PDF with the file picker
3. Pick a theme from the dropdown (Solarized Dark is a good first try)
4. Compare the two renders side-by-side
5. Use Prev/Next to walk through pages and stress-test against different content
6. Watch the timing display and the stats log at the bottom

## What we're trying to learn

1. **Quality:** Does the dark render actually look good on real PDFs? Specifically — does it preserve image colors, handle text clearly, and avoid the "muddy invert" look?
2. **Performance:** What's the rendering overhead vs. baseline? My estimate was 10–30% — the prototype will tell us the real number.
3. **Edge cases:** Does it break on anything unusual (forms, scanned PDFs, complex vector graphics, large image-heavy pages)?
4. **Integration friction:** Does doq cleanly plug into `pdfjs-dist` without modifications, or do we need to fix things?

## doq attribution

`doq/` contains files vendored from <https://github.com/shivaprsd/doq> (MIT License). See `doq/LICENSE.txt`. We are not a fork — we're consuming `doq` as a library. If we proceed past Phase 2, we'd track upstream for fixes.
