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
