/**
 * Shared paging helpers for directory listings.
 *
 * Long-tail pages (a country with thousands of institutions) must be split:
 * Googlebot stops parsing a single HTML document around the 2 MB mark, so
 * everything past that point is neither read nor followed.
 */

/** Rows per listing page. */
export const LIST_PAGE_SIZE = 50;

export interface PageSlice<T> {
  items: T[];
  /** Clamped page number (1-based). */
  page: number;
  totalPages: number;
  total: number;
}

/** Slice `items` into the requested window, clamping `page` into range. */
export function paginate<T>(
  items: T[],
  page: number,
  size: number = LIST_PAGE_SIZE,
): PageSlice<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.trunc(page)), totalPages);
  const start = (current - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: current,
    totalPages,
    total: items.length,
  };
}

/** Parse a route segment into a page number; null when it is not a positive integer. */
export function parsePageSegment(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  return Number(raw);
}

/** Path of a listing page; page 1 lives at `basePath` itself. */
export function pagePath(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

/**
 * Page numbers to surface in the nav: the first and last page, plus a window
 * around the current one. `"gap"` marks an omitted run and renders as an
 * ellipsis.
 */
export function pageWindow(
  current: number,
  totalPages: number,
  span = 1,
): (number | "gap")[] {
  const keep = new Set<number>([1, totalPages]);
  for (let page = current - span; page <= current + span; page += 1) {
    if (page >= 1 && page <= totalPages) keep.add(page);
  }
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) out.push("gap");
    out.push(page);
  });
  return out;
}
