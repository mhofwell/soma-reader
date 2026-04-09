export interface SlotMeasurement {
  pageNum: number;
  offsetTop: number;
  height: number;
}

/**
 * Given a list of page-slot measurements (sorted by offsetTop) and the scroll
 * container's current scroll position + viewport height, returns the page
 * number whose vertical center is closest to the viewport's vertical center.
 *
 * Uses binary search (O(log n)) since slots are sorted by offsetTop. For a
 * 500-page document this is ~9 iterations vs 500 in a linear scan — meaningful
 * because this runs on every scroll frame via requestAnimationFrame.
 *
 * Returns 1 as a safe default if the list is empty.
 */
export function computeClosestPage(
  slots: SlotMeasurement[],
  scrollTop: number,
  clientHeight: number
): number {
  if (slots.length === 0) return 1;

  const viewportCenter = scrollTop + clientHeight / 2;

  // Binary search for the first slot whose center >= viewportCenter
  let lo = 0;
  let hi = slots.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midCenter = slots[mid].offsetTop + slots[mid].height / 2;
    if (midCenter < viewportCenter) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // lo is the first slot whose center >= viewportCenter (or the last slot).
  // The closest page is either lo or lo-1 — check both.
  let closest = slots[lo].pageNum;
  let minDist = Math.abs(slots[lo].offsetTop + slots[lo].height / 2 - viewportCenter);

  if (lo > 0) {
    const prevDist = Math.abs(
      slots[lo - 1].offsetTop + slots[lo - 1].height / 2 - viewportCenter
    );
    if (prevDist < minDist) {
      closest = slots[lo - 1].pageNum;
    }
  }

  return closest;
}
