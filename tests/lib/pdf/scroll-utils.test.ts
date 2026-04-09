import { describe, it, expect } from 'vitest';
import { computeClosestPage } from '../../../src/lib/pdf/scroll-utils';

describe('computeClosestPage', () => {
  // Three letter-sized pages stacked with 24px gap between them
  const slots = [
    { pageNum: 1, offsetTop: 32, height: 1188 },   // 32 → 1220
    { pageNum: 2, offsetTop: 1244, height: 1188 },  // 1244 → 2432
    { pageNum: 3, offsetTop: 2456, height: 1188 },  // 2456 → 3644
  ];

  it('returns page 1 when scrolled to top', () => {
    // viewport center = 0 + 900/2 = 450. Page 1 center = 32 + 594 = 626.
    expect(computeClosestPage(slots, 0, 900)).toBe(1);
  });

  it('returns page 2 when viewport is centered on page 2', () => {
    // scroll to page 2 top (1244). viewport center = 1244 + 450 = 1694.
    // Page 2 center = 1244 + 594 = 1838. Page 1 center = 626. Closer to 2.
    expect(computeClosestPage(slots, 1244, 900)).toBe(2);
  });

  it('returns page 3 when scrolled to bottom', () => {
    expect(computeClosestPage(slots, 2456, 900)).toBe(3);
  });

  it('transitions from page 1 to page 2 at the midpoint between them', () => {
    // Page 1 center = 626. Page 2 center = 1838. Midpoint = (626+1838)/2 = 1232.
    // Viewport center = scrollTop + 450. scrollTop for midpoint = 1232 - 450 = 782.
    // At midpoint: equidistant. At midpoint + 1, page 2 wins.
    expect(computeClosestPage(slots, 783, 900)).toBe(2);
    expect(computeClosestPage(slots, 781, 900)).toBe(1);
  });

  it('handles a single page', () => {
    const single = [{ pageNum: 1, offsetTop: 0, height: 500 }];
    expect(computeClosestPage(single, 0, 800)).toBe(1);
  });

  it('returns 1 as default for empty slots', () => {
    expect(computeClosestPage([], 0, 800)).toBe(1);
  });

  it('handles non-sequential page numbers', () => {
    // e.g. if eviction removed some slot measurements from the list
    const sparse = [
      { pageNum: 3, offsetTop: 0, height: 1000 },
      { pageNum: 7, offsetTop: 1024, height: 1000 },
    ];
    // viewport center at 1024 + 400 = 1424. Page 3 center = 500. Page 7 center = 1524.
    // Distance to 3 = 924, distance to 7 = 100. Closest = 7.
    expect(computeClosestPage(sparse, 1024, 800)).toBe(7);
  });

  it('works with a tall viewport that spans multiple pages', () => {
    // viewport = 3000px (taller than all content). scrollTop = 0.
    // viewport center = 1500. Page 1 center = 626, Page 2 center = 1838, Page 3 center = 3050.
    // Closest to 1500: page 2 (distance 338) vs page 1 (874) vs page 3 (1550).
    expect(computeClosestPage(slots, 0, 3000)).toBe(2);
  });
});
