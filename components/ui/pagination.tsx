'use client';

import { PAGE_SIZES, type PageSize } from '@/lib/use-paginated';

/**
 * The bar under a table: what you are looking at, and how to move.
 *
 * ── THE WINDOW ─────────────────────────────────────────────────────────────
 *
 * With 30 pages, rendering 30 buttons is not navigation, it is a wall. So the
 * control shows first, last, and a short run around the current page, with
 * ellipses standing in for the rest — the shape every table the desk already
 * uses has, which means nobody has to learn it.
 *
 * The count reads "1–25 of 728" rather than "page 1 of 30" because the desk's
 * question is almost always how many records there are, not how many pages.
 * Both are shown; the record count is the one in plain language.
 */
function windowed(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const out: (number | 'gap')[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);

  if (from > 2) out.push('gap');
  for (let p = from; p <= to; p++) out.push(p);
  if (to < pageCount - 1) out.push('gap');

  out.push(pageCount);
  return out;
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  from,
  to,
  setPage,
  setPageSize,
  noun,
}: {
  page: number;
  pageCount: number;
  pageSize: PageSize;
  total: number;
  from: number;
  to: number;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
  /** Plural, lowercase — "departures", "travellers". Comes from the brand vocabulary. */
  noun: string;
}) {
  const step =
    'rounded-control border border-border bg-surface px-2 text-base text-ink disabled:cursor-not-allowed disabled:border-border-faint disabled:text-ink-disabled';

  return (
    <nav
      aria-label={`${noun} pagination`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border-faint bg-surface-alt"
      style={{ padding: 'var(--cell-padding-y) var(--cell-padding-x)' }}
    >
      <p className="m-0 text-sm text-ink-soft">
        {total === 0 ? (
          <>No {noun}</>
        ) : (
          <>
            <span className="tabular font-semibold text-ink">
              {from}–{to}
            </span>{' '}
            of <span className="tabular font-semibold text-ink">{total}</span> {noun}
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-ink-soft">
          Rows
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value) as PageSize)}
            className="rounded-control border border-border bg-surface px-1.5 py-1 text-base text-ink"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className={step}
            style={{ minHeight: 'var(--target-pointer)' }}
          >
            Previous
          </button>

          {windowed(page, pageCount).map((entry, index) =>
            entry === 'gap' ? (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: gaps have no identity beyond position
                key={`gap-${index}`}
                aria-hidden
                className="px-1 text-sm text-ink-faint"
              >
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => setPage(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className={`tabular rounded-control border px-2 text-base ${
                  entry === page
                    ? 'border-accent bg-accent font-semibold text-accent-ink'
                    : 'border-border bg-surface text-ink hover:bg-hover-wash'
                }`}
                style={{ minHeight: 'var(--target-pointer)', minWidth: 'var(--target-pointer)' }}
              >
                {entry}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page === pageCount}
            className={step}
            style={{ minHeight: 'var(--target-pointer)' }}
          >
            Next
          </button>
        </div>
      </div>
    </nav>
  );
}
