<script lang="ts">
  import { onDestroy } from 'svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { renderPageToCanvas } from '$lib/pdf/renderer';
  import { computeClosestPage } from '$lib/pdf/scroll-utils';
  import { resolveActiveTheme, setActiveTheme } from '$lib/doq-bridge';
  import { TextLayerBuilder, AnnotationLayerBuilder } from 'pdfjs-dist/web/pdf_viewer.mjs';
  import { SomaLinkService } from '$lib/pdf/link-service';

  type PageDim = { width: number; height: number };

  let scrollContainer: HTMLDivElement;
  // Slots register themselves via the `registerSlot` action as they mount.
  // We read this Map imperatively from effects, observer callbacks, and
  // event handlers. Using an action avoids the "reactive state reassigned
  // from inside an effect" warning we'd get with `bind:this` into an array.
  const slotsByPage = new Map<number, HTMLDivElement>();

  function registerSlot(node: HTMLElement, pageNum: number) {
    slotsByPage.set(pageNum, node as HTMLDivElement);
    // If the observer already exists (later doc, or scale change), start
    // observing this new slot immediately.
    renderObserver?.observe(node);
    return {
      destroy(): void {
        slotsByPage.delete(pageNum);
      }
    };
  }

  let pageDims = $state<PageDim[]>([]);
  // Record keyed by pageNumber → error message. Record (not Map) so that
  // reassigning with spread gives us reactive reads in the template.
  let pageErrors = $state<Record<number, string>>({});

  // Non-reactive state: rendered page layers and token bookkeeping.
  interface PageLayers {
    canvas: HTMLCanvasElement;
    wrapper: HTMLDivElement;
    textBuilder: InstanceType<typeof TextLayerBuilder> | null;
    annotBuilder: InstanceType<typeof AnnotationLayerBuilder> | null;
  }

  const renderedPages = new Map<number, PageLayers>();
  const renderTokens = new Map<number, number>();
  const evictionTimers = new Map<number, ReturnType<typeof setTimeout>>();
  // Debounced render dispatch: IntersectionObserver can fire many entries
  // during a fast scroll; we delay the actual render kick-off so pages the
  // user blows past never start rendering in the first place.
  const renderDispatchTimers = new Map<number, ReturnType<typeof setTimeout>>();
  const RENDER_DISPATCH_DELAY_MS = 120;
  const SMOOTH_SCROLL_THRESHOLD = 5;

  const linkService = new SomaLinkService({
    navigateToPage(pageNum: number) {
      const clamped = Math.max(1, Math.min(pdf.numPages, pageNum));
      const slot = slotsByPage.get(clamped);
      if (!slot || !scrollContainer) return;

      const distance = Math.abs(clamped - pdf.currentPage);
      const behavior: ScrollBehavior = distance <= SMOOTH_SCROLL_THRESHOLD ? 'smooth' : 'instant';

      isProgrammaticScroll = true;
      if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
      programmaticScrollTimer = setTimeout(() => {
        isProgrammaticScroll = false;
        programmaticScrollTimer = null;
      }, behavior === 'smooth' ? 700 : 100);

      slot.scrollIntoView({ block: 'start', behavior });
      pdf.goToPage(clamped);
    },
    getCurrentPage: () => pdf.currentPage,
    getPagesCount: () => pdf.numPages,
  });

  // Cached slot measurements for the scroll handler. Rebuilt when pageDims
  // changes (the only time slot positions can change). The scroll handler
  // reads this array instead of forcing layout reads on every frame.
  let cachedSlotMeasurements: import('$lib/pdf/scroll-utils').SlotMeasurement[] = [];

  // Suppresses handleScroll during a programmatic smooth scroll (nav button /
  // thumbnail / arrow key). Without this, the scroll handler would read
  // intermediate scroll positions and overwrite the target page.
  let isProgrammaticScroll = false;
  let programmaticScrollTimer: ReturnType<typeof setTimeout> | null = null;

  // Sentinel: when handleScroll updates pdf.currentPage, it sets this to the
  // new page BEFORE the state change. The programmatic-scroll effect checks
  // and consumes this to distinguish "nav click → scroll to target" from
  // "scroll handler → just update the indicator, don't re-scroll". Without
  // this, every user scroll would trigger scrollIntoView() for the new
  // closest page, fighting the user's scroll.
  let scrollOriginatedPage: number | null = null;

  let renderObserver: IntersectionObserver | null = null;

  // Reactive devicePixelRatio — rendered canvases need to re-render when the
  // user drags the window to a different-DPR monitor or changes browser zoom.
  let currentDpr = $state(
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  );

  $effect(() => {
    if (typeof window === 'undefined') return;

    function updateDpr(): void {
      const next = window.devicePixelRatio || 1;
      if (next !== currentDpr) currentDpr = next;
    }

    window.addEventListener('resize', updateDpr);
    const mq = window.matchMedia(`(resolution: ${currentDpr}dppx)`);
    const mqListener = (): void => updateDpr();
    mq.addEventListener('change', mqListener);

    return () => {
      window.removeEventListener('resize', updateDpr);
      mq.removeEventListener('change', mqListener);
    };
  });

  // Fetch page dimensions when the doc or scale changes. Invalidates and
  // clears all rendered canvases so visible slots will be re-rendered via
  // the observer once pageDims is updated. Pages render at the current
  // ui.effectiveScale — defaults to 100% (zoomIndex 2 × BASE_SCALE 1.5).
  $effect(() => {
    const doc = pdf.doc;
    const scale = ui.effectiveScale;

    linkService.setDocument(doc);

    if (!doc) {
      pageDims = [];
      return;
    }

    // Invalidate all rendered pages (scale change means stale pixels)
    for (const pageNum of renderedPages.keys()) {
      renderTokens.set(pageNum, (renderTokens.get(pageNum) ?? 0) + 1);
    }
    for (const layers of renderedPages.values()) {
      layers.textBuilder?.cancel();
      layers.annotBuilder?.cancel();
      layers.canvas.width = 0;
      layers.canvas.height = 0;
    }
    renderedPages.clear();
    for (const slot of slotsByPage.values()) {
      slot.replaceChildren();
    }
    // Cancel any pending evictions — the canvases are already gone
    for (const timer of evictionTimers.values()) clearTimeout(timer);
    evictionTimers.clear();
    // Cancel any pending render dispatches — they'd render at the old scale
    for (const timer of renderDispatchTimers.values()) clearTimeout(timer);
    renderDispatchTimers.clear();

    let cancelled = false;
    (async () => {
      const dims: PageDim[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        if (cancelled) return;
        try {
          const page = await doc.getPage(n);
          const vp = page.getViewport({ scale });
          dims.push({ width: vp.width, height: vp.height });
        } catch (err) {
          // Fall back to a letter-sized placeholder so the layout stays
          // coherent. The page itself will show a render error later.
          dims.push({ width: 612 * scale, height: 792 * scale });
        }
      }
      if (cancelled) return;
      pageDims = dims;
      // Slots register themselves via the registerSlot action as they mount.
    })();

    return () => {
      cancelled = true;
    };
  });

  /** Invalidate all currently-rendered pages and re-render them. Used
   *  by both the theme-change and DPR-change effects (same operation,
   *  different trigger). */
  function rerenderVisiblePages(): void {
    for (const pageNum of Array.from(renderedPages.keys())) {
      renderTokens.set(pageNum, (renderTokens.get(pageNum) ?? 0) + 1);
      const layers = renderedPages.get(pageNum);
      if (layers) {
        layers.textBuilder?.cancel();
        layers.annotBuilder?.cancel();
        layers.canvas.width = 0;
        layers.canvas.height = 0;
      }
      renderedPages.delete(pageNum);
      slotsByPage.get(pageNum)?.replaceChildren();
      void renderPage(pageNum);
    }
  }

  // Theme or DPR change: re-apply the active theme and re-render all
  // currently-rendered pages. Both triggers need the same invalidation
  // (flush canvases + re-render), and setActiveTheme is idempotent, so
  // a single combined effect is simpler than two separate ones.
  $effect(() => {
    const themeId = ui.activeThemeId;
    void currentDpr; // read so Svelte tracks DPR as a reactive dependency
    if (!pdf.doc) return;

    const theme = resolveActiveTheme(themeId);
    if (theme) {
      setActiveTheme(theme);
      if (theme.id !== themeId) ui.setActiveThemeId(theme.id);
    }

    rerenderVisiblePages();
  });

  // Set up the IntersectionObserver once pageDims is populated. Observes all
  // slots, renders on enter, schedules eviction 3s after exit. Uses
  // rootMargin: 1500px so pages render ~2 pages ahead of scroll.
  $effect(() => {
    // Depend on both so this effect re-runs when a new document lays out
    // fresh slots.
    const dimsLen = pageDims.length;
    if (!pdf.doc || dimsLen === 0 || !scrollContainer) return;

    let cancelled = false;

    // Wait one microtask so Svelte has populated slotElements via bind:this
    queueMicrotask(() => {
      if (cancelled) return;

      renderObserver?.disconnect();

      renderObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const el = entry.target as HTMLElement;
            const pageNum = Number(el.dataset.page);
            if (!pageNum) continue;

            if (entry.isIntersecting) {
              // Entering: cancel pending eviction, debounce render dispatch
              const evictTimer = evictionTimers.get(pageNum);
              if (evictTimer) {
                clearTimeout(evictTimer);
                evictionTimers.delete(pageNum);
              }
              if (!renderedPages.has(pageNum)) {
                // Debounce render dispatch: during fast scroll the observer
                // fires for many pages in quick succession. Delaying the
                // dispatch lets us skip pages the user blows past.
                const existing = renderDispatchTimers.get(pageNum);
                if (existing) clearTimeout(existing);
                const dispatchTimer = setTimeout(() => {
                  renderDispatchTimers.delete(pageNum);
                  void renderPage(pageNum);
                }, RENDER_DISPATCH_DELAY_MS);
                renderDispatchTimers.set(pageNum, dispatchTimer);
              }
            } else {
              // Exiting: cancel pending render dispatch (not yet started)
              const dispatchTimer = renderDispatchTimers.get(pageNum);
              if (dispatchTimer) {
                clearTimeout(dispatchTimer);
                renderDispatchTimers.delete(pageNum);
              }
              // Schedule eviction after grace period for already-rendered pages
              if (
                renderedPages.has(pageNum) &&
                !evictionTimers.has(pageNum)
              ) {
                const timer = setTimeout(() => {
                  evictPage(pageNum);
                  evictionTimers.delete(pageNum);
                }, 3000);
                evictionTimers.set(pageNum, timer);
              }
            }
          }
        },
        {
          root: scrollContainer,
          rootMargin: '1500px 0px 1500px 0px'
        }
      );

      for (let n = 1; n <= dimsLen; n++) {
        const slot = slotsByPage.get(n);
        if (slot) renderObserver.observe(slot);
      }

      // Cache slot measurements so the scroll handler doesn't force
      // layout reads on every frame. Slot positions only change when
      // pageDims changes (scale/doc change), not during scroll.
      cachedSlotMeasurements = Array.from(slotsByPage).map(([pageNum, el]) => ({
        pageNum,
        offsetTop: el.offsetTop,
        height: el.clientHeight,
      }));
    });

    return () => {
      cancelled = true;
      renderObserver?.disconnect();
      renderObserver = null;
    };
  });

  async function renderPage(pageNum: number): Promise<void> {
    if (!pdf.doc) return;
    const myToken = (renderTokens.get(pageNum) ?? 0) + 1;
    renderTokens.set(pageNum, myToken);

    try {
      const page = await pdf.doc.getPage(pageNum);
      if (myToken !== renderTokens.get(pageNum)) return;

      const viewport = page.getViewport({ scale: ui.effectiveScale });

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.setProperty('--scale-factor', String(ui.effectiveScale));

      // ── Canvas ──
      const canvas = document.createElement('canvas');
      await renderPageToCanvas(page, canvas, {
        scale: ui.effectiveScale,
        dpr: currentDpr,
        cacheId: `page-${pageNum}-${ui.activeThemeId}-${ui.effectiveScale}-${currentDpr}`
      });

      if (myToken !== renderTokens.get(pageNum)) return;

      wrapper.appendChild(canvas);

      // ── Text Layer + Annotation Layer (concurrent, non-fatal) ──
      let textBuilder: InstanceType<typeof TextLayerBuilder> | null = null;
      let annotBuilder: InstanceType<typeof AnnotationLayerBuilder> | null = null;

      const textPromise = (async () => {
        const tb = new TextLayerBuilder({ pdfPage: page });
        await tb.render(viewport);
        wrapper.appendChild(tb.div);
        return tb;
      })();

      const annotPromise = (async () => {
        const ab = new AnnotationLayerBuilder({
          pdfPage: page,
          linkService,
        });
        await ab.render(viewport);
        if (ab.div) wrapper.appendChild(ab.div);
        return ab;
      })();

      const [textResult, annotResult] = await Promise.allSettled([
        textPromise,
        annotPromise,
      ]);

      if (myToken !== renderTokens.get(pageNum)) return;

      if (textResult.status === 'fulfilled') {
        textBuilder = textResult.value;
      }
      if (annotResult.status === 'fulfilled') {
        annotBuilder = annotResult.value;
      }

      renderedPages.set(pageNum, {
        canvas,
        wrapper,
        textBuilder,
        annotBuilder,
      });
      slotsByPage.get(pageNum)?.replaceChildren(wrapper);

      if (pageErrors[pageNum]) {
        const next = { ...pageErrors };
        delete next[pageNum];
        pageErrors = next;
      }
    } catch (err) {
      if (myToken !== renderTokens.get(pageNum)) return;
      const msg = err instanceof Error ? err.message : String(err);
      pageErrors = {
        ...pageErrors,
        [pageNum]: `This page failed to render (${msg})`
      };
      slotsByPage.get(pageNum)?.replaceChildren();
    }
  }

  function evictPage(pageNum: number): void {
    const layers = renderedPages.get(pageNum);
    if (!layers) return;

    layers.textBuilder?.cancel();
    layers.annotBuilder?.cancel();
    // Zero the canvas so the browser can GC the backing bitmap.
    layers.canvas.width = 0;
    layers.canvas.height = 0;

    renderedPages.delete(pageNum);
    slotsByPage.get(pageNum)?.replaceChildren();
  }

  // Programmatic scroll: when pdf.currentPage changes because the user
  // clicked a nav button / thumbnail / pressed arrow keys, smooth-scroll
  // the target slot into view. isProgrammaticScroll suppresses the scroll
  // handler's feedback loop.
  $effect(() => {
    const page = pdf.currentPage;
    if (!scrollContainer || !pdf.doc) return;

    // If this page change was triggered by the scroll handler (user scrolled
    // into a new page), consume the sentinel and bail. Without this, we'd
    // re-scroll on every manual-scroll frame and fight the user's scroll.
    if (scrollOriginatedPage === page) {
      scrollOriginatedPage = null;
      return;
    }
    scrollOriginatedPage = null;

    const slot = slotsByPage.get(page);
    if (!slot) return;

    // Skip if already roughly at the top of the container (no visible change)
    const containerRect = scrollContainer.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const slotOffsetFromContainerTop = slotRect.top - containerRect.top;
    if (Math.abs(slotOffsetFromContainerTop) < 40) return;

    isProgrammaticScroll = true;
    if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
    programmaticScrollTimer = setTimeout(() => {
      isProgrammaticScroll = false;
      programmaticScrollTimer = null;
    }, 700);

    slot.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  let scrollRafScheduled = false;
  function handleScroll(): void {
    if (isProgrammaticScroll) return;
    if (pageDims.length === 0) return;
    if (scrollRafScheduled) return;
    scrollRafScheduled = true;

    requestAnimationFrame(() => {
      scrollRafScheduled = false;
      if (!scrollContainer || cachedSlotMeasurements.length === 0) return;

      const closestPage = computeClosestPage(
        cachedSlotMeasurements,
        scrollContainer.scrollTop,
        scrollContainer.clientHeight
      );

      if (closestPage !== pdf.currentPage) {
        // Mark this update as scroll-originated so the programmatic-scroll
        // effect bails instead of re-issuing scrollIntoView. MUST be set
        // before the store write so the effect sees it when it runs.
        scrollOriginatedPage = closestPage;
        pdf.goToPage(closestPage);
      }
    });
  }

  onDestroy(() => {
    renderObserver?.disconnect();
    if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
    for (const timer of evictionTimers.values()) clearTimeout(timer);
    evictionTimers.clear();
    for (const timer of renderDispatchTimers.values()) clearTimeout(timer);
    renderDispatchTimers.clear();
    for (const layers of renderedPages.values()) {
      layers.textBuilder?.cancel();
      layers.annotBuilder?.cancel();
      layers.canvas.width = 0;
      layers.canvas.height = 0;
    }
    renderedPages.clear();
  });
</script>

<div
  class="page-view"
  role="region"
  aria-label="PDF page viewer"
  bind:this={scrollContainer}
  onscroll={handleScroll}
>
  <!-- aria-live is scoped to this sr-only node so canvas replaceChildren()
       calls don't trigger screen-reader announcements on every swap. Only
       the "Page X of Y" text content change triggers a polite announcement. -->
  <div class="sr-only" aria-live="polite" aria-atomic="true">
    Page {pdf.currentPage} of {pdf.numPages}
  </div>

  <div class="pages-content">
    {#each pageDims as dim, i (i)}
      <div
        class="page-slot"
        style="width: {dim.width}px; height: {dim.height}px;"
        data-page={i + 1}
        use:registerSlot={i + 1}
      >
        {#if pageErrors[i + 1]}
          <div class="render-error" role="alert">
            <p>{pageErrors[i + 1]}</p>
            <p class="hint">You can still navigate to other pages.</p>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .page-view {
    flex: 1;
    overflow: auto;
    background: var(--bg);
    position: relative;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 20px;
    /* Fade in on mount so the hero → reader handoff is smooth instead of
       snapping. The EmptyState unmounts and PageView mounts in the same
       Svelte tick; without this fade-in the user sees an instant swap. */
    animation: page-view-enter 280ms ease-out both;
    /* `safe center` horizontally centers .pages-content when it fits, and
       falls back to start-alignment when a slot is wider than the viewport
       (high zoom) so overflow is scrollable instead of clipped. */
    align-items: safe center;
    /* Reserve scrollbar gutter so the horizontal centering stays consistent
       whether or not a scrollbar is visible. Without this, showing/hiding
       the scrollbar changes the content-box width and shifts the centered
       page by ~15px. */
    scrollbar-gutter: stable;
  }

  .pages-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 32px 24px 90px 24px; /* bottom padding leaves room for the pill */
    /* flex-shrink: 0 prevents the flex parent from squeezing the content
       below its natural width, which would distort slot aspect ratios. */
    flex-shrink: 0;
  }

  .page-slot {
    position: relative;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .page-slot :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
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

  @keyframes page-view-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
