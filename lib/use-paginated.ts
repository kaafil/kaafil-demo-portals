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
 * ── TWO DIFFERENT WAYS THE PAGE GOES STALE ─────────────────────────────────
 *
 * They look alike and want opposite answers.
 *
 * 1. The list shrank under you and the current page no longer exists. An empty
 *    "page 6 of 2" reads as broken rather than filtered, so the effect below
 *    CLAMPS into range. This is the safety net, and it should rarely fire.
 *
 * 2. The user changed the filter. Clamping is wrong here: searching from page
 *    30 and landing on the last page of the new results is technically valid
 *    and reliably confusing — what somebody wants after a search is the TOP of
 *    what they just found. So a caller passes `resetKey` holding whatever its
 *    filter state is, and any change to it RESETS to page one.
 *
 * Without `resetKey` only the clamp applies, which is the safe default but
 * leaves case 2 feeling wrong. Both call sites in this repo pass it.
 */
export function usePaginated<T>(
  all: readonly T[],
  options: { initialSize?: PageSize; resetKey?: string } = {},
): Paginated<T> {
  const { initialSize = 25, resetKey } = options;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState<PageSize>(initialSize);

  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Case 2: the filter moved. Back to the top of the new result set.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetting ON the key changing is the point
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  // Case 1: the safety net.
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
