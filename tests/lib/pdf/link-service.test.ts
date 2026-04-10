import { describe, it, expect, vi, beforeEach } from 'vitest';

const createService = async () => {
  const { SomaLinkService } = await import('../../../src/lib/pdf/link-service');
  return new SomaLinkService({
    navigateToPage: navigateFn,
    getCurrentPage: () => currentPage,
    getPagesCount: () => 20,
  });
};

let navigateFn: ReturnType<typeof vi.fn>;
let currentPage: number;

beforeEach(() => {
  navigateFn = vi.fn();
  currentPage = 1;
});

describe('SomaLinkService', () => {
  describe('properties', () => {
    it('pagesCount delegates to getPagesCount', async () => {
      const svc = await createService();
      expect(svc.pagesCount).toBe(20);
    });

    it('page getter delegates to getCurrentPage', async () => {
      currentPage = 7;
      const svc = await createService();
      expect(svc.page).toBe(7);
    });

    it('page setter calls navigateToPage', async () => {
      const svc = await createService();
      svc.page = 5;
      expect(navigateFn).toHaveBeenCalledWith(5);
    });

    it('isInPresentationMode returns false', async () => {
      const svc = await createService();
      expect(svc.isInPresentationMode).toBe(false);
    });

    it('externalLinkEnabled is true', async () => {
      const svc = await createService();
      expect(svc.externalLinkEnabled).toBe(true);
    });

    it('eventBus is undefined', async () => {
      const svc = await createService();
      expect(svc.eventBus).toBeUndefined();
    });
  });

  describe('goToPage', () => {
    it('calls navigateToPage with the page number', async () => {
      const svc = await createService();
      svc.goToPage(10);
      expect(navigateFn).toHaveBeenCalledWith(10);
    });

    it('ignores invalid page numbers', async () => {
      const svc = await createService();
      svc.goToPage(0);
      svc.goToPage(21);
      svc.goToPage(NaN);
      expect(navigateFn).not.toHaveBeenCalled();
    });
  });

  describe('goToDestination', () => {
    it('resolves a named destination to a page and navigates', async () => {
      const svc = await createService();
      const fakeDoc = {
        numPages: 20,
        getDestination: vi.fn().mockResolvedValue([{ num: 5, gen: 0 }, { name: 'Fit' }]),
        getPageIndex: vi.fn().mockResolvedValue(4),
        cachedPageNumber: vi.fn().mockReturnValue(null),
      };
      svc.setDocument(fakeDoc as any);
      await svc.goToDestination('chapter-2');
      expect(navigateFn).toHaveBeenCalledWith(5);
    });

    it('resolves an integer page ref', async () => {
      const svc = await createService();
      const fakeDoc = {
        numPages: 20,
        getDestination: vi.fn(),
        getPageIndex: vi.fn(),
        cachedPageNumber: vi.fn(),
      };
      svc.setDocument(fakeDoc as any);
      await svc.goToDestination([3, { name: 'Fit' }]);
      expect(navigateFn).toHaveBeenCalledWith(4);
    });

    it('does nothing without a document', async () => {
      const svc = await createService();
      await svc.goToDestination('chapter-1');
      expect(navigateFn).not.toHaveBeenCalled();
    });
  });

  describe('link rendering helpers', () => {
    it('getDestinationHash returns "#"', async () => {
      const svc = await createService();
      expect(svc.getDestinationHash('some-dest')).toBe('#');
    });

    it('getAnchorUrl returns empty string', async () => {
      const svc = await createService();
      expect(svc.getAnchorUrl('')).toBe('');
    });

    it('addLinkAttributes sets target and rel for external links', async () => {
      const svc = await createService();
      const link = document.createElement('a');
      svc.addLinkAttributes(link, 'https://example.com', true);
      expect(link.href).toContain('https://example.com');
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
    });
  });

  describe('executeNamedAction', () => {
    it('NextPage navigates to currentPage + 1', async () => {
      currentPage = 5;
      const svc = await createService();
      svc.executeNamedAction('NextPage');
      expect(navigateFn).toHaveBeenCalledWith(6);
    });

    it('PrevPage navigates to currentPage - 1', async () => {
      currentPage = 5;
      const svc = await createService();
      svc.executeNamedAction('PrevPage');
      expect(navigateFn).toHaveBeenCalledWith(4);
    });

    it('FirstPage navigates to page 1', async () => {
      const svc = await createService();
      svc.executeNamedAction('FirstPage');
      expect(navigateFn).toHaveBeenCalledWith(1);
    });

    it('LastPage navigates to last page', async () => {
      const svc = await createService();
      svc.executeNamedAction('LastPage');
      expect(navigateFn).toHaveBeenCalledWith(20);
    });

    it('GoBack is a no-op', async () => {
      const svc = await createService();
      svc.executeNamedAction('GoBack');
      expect(navigateFn).not.toHaveBeenCalled();
    });
  });

  describe('executeSetOCGState', () => {
    it('is a no-op', async () => {
      const svc = await createService();
      svc.executeSetOCGState({});
    });
  });
});
