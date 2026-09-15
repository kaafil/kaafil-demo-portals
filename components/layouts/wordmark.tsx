import type { Route } from 'next';
import Link from 'next/link';
import { BRAND } from '@/config/brand';

/**
 * The brand mark, wherever chrome needs it.
 *
 * ── WHY THIS COMPONENT EXISTS ──────────────────────────────────────────────
 *
 * Rendering `BRAND.productName` as text in each shell is the obvious shortcut,
 * and it breaks on the first real client: plenty of operators' brands ARE a
 * wordmark, and setting `productName` to their name gets you the right word in
 * the wrong typeface.
 *
 * So the capability lives here, on `main`, where every branch inherits it
 * rather than editing `desk-shell.tsx` for itself. That is the intended loop
 * and it is worth naming: a branch that needs to touch a component is
 * reporting a gap in `main`. Fix it on `main` and merge down.
 *
 * ── WHY BOTH AN IMAGE AND TEXT ─────────────────────────────────────────────
 *
 * `logoPath` may be a placeholder (it is on `main`), so the product name stays
 * as the `alt`. A branch with no logo file at all sets `logoPath` to `null`
 * and gets clean text set in their own typeface — which is a real answer for
 * a prospect whose mark is just their name.
 *
 * Height is a token-relative length, never a pixel count: the mark has to
 * scale with the chrome a branch configured, not with a number written here.
 */
export function Wordmark({ href, height = '1.5rem' }: { href?: Route; height?: string }) {
  const inner =
    BRAND.logoPath === null ? (
      <span className="font-semibold tracking-wide">{BRAND.productName}</span>
    ) : (
      // Deliberately a plain <img>, not next/image. This is one small mark in
      // the chrome of every page — it needs no lazy loading, no srcset and no
      // layout-shift machinery, and next/image would demand intrinsic
      // dimensions that change with every branch's logo file.
      // biome-ignore lint/performance/noImgElement: chrome mark, see above
      <img
        src={BRAND.logoPath}
        alt={BRAND.productName}
        style={{ height, width: 'auto' }}
        className="block"
      />
    );

  return href === undefined ? (
    <span className="flex items-center text-topbar-ink">{inner}</span>
  ) : (
    <Link href={href} className="flex items-center text-topbar-ink no-underline">
      {inner}
    </Link>
  );
}
