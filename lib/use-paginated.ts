'use client';

import { useEffect, useMemo, useState } from 'react';

/** Page sizes the desk can choose between. 25 fills a laptop without scrolling. */
export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface Paginated<T> {
  rows: readonly T[];
  page: number;
  pageCount: number;
  pageSize: PageSize;
  total: number;
  /** 1-based index of the first row shown, or 0 when there are none. */
  from: number;
  to: number;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
}

/**
 * Client-side pagination over a list already in memory.
 *
 * ── WHY CLIENT-SIDE, AND WHEN IT SHOULD STOP BEING ─────────────────────────
 *
 * The desk holds 56 departures and 728 travellers. Both fit in a payload
 * comfortably, and paginating them in the browser means filtering and paging
 * compose for free: type into the search box and the page count follows,
 * with no round trip and no stale-page flicker.
 *
 * That stops being true somewhere in the low thousands, and when it does the
 * change is a real one — `page`/`pageSize` move into the query, the server
 * returns a count alongside the slice, and filtering has to move with them or
 * the two disagree. A partner copying this repo should make that call on their
 * own volumes rather than inherit ours, which is why the boundary is written
 * down here instead of being implied.
 *
 * ── THE RESET THAT IS EASY TO FORGET ───────────────────────────────────────
 *
 * When a filter shrinks the list, the current page can fall off the end, and a
 * table that renders an empty page 6 of 2 looks broken rather than filtered.
 * The effect below clamps back into range whenever the row count changes.
 */
export function usePaginated<T>(all: readonly T[], initialSize: PageSize = 25): Paginated<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState<PageSize>(initialSize);

  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;

  const rows = useMemo(() => all.slice(start, start + pageSize), [all, start, pageSize]);

  return {
    rows,
    page: safePage,
    pageCount,
    pageSize,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
    setPage: (next) => setPage(Math.min(Math.max(1, next), pageCount)),
    setPageSize: (size) => {
      setPageSizeRaw(size);
      // Jumping from page 20 of 30 to page 20 of 8 would land out of range.
      // Going back to the first page is the predictable answer and is what
      // every table the desk already uses does.
      setPage(1);
    },
  };
}
