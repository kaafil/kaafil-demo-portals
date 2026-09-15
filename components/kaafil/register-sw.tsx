'use client';

import { useEffect } from 'react';

/**
 * Registers the field app's service worker, scoped to `/m`.
 *
 * ── `/m`, NOT `/m/` ────────────────────────────────────────────────────────
 *
 * Scope is a plain PREFIX match on the URL, and that one trailing slash is the
 * difference between working and not. A worker scoped to `/m/` controls
 * `/m/login` and `/m/host/expense` — and does NOT control `/m` itself, which
 * is the route the whole offline story is about. It registered, activated,
 * precached the shell, reported a healthy scope, and then sat there not
 * controlling the one page it existed for. The symptom was a flat
 * `ERR_CONNECTION_REFUSED` on reload, which looks like no worker at all.
 *
 * `/m` covers `/m` and everything beneath it. It would also cover a
 * hypothetical `/mango`, which is the usual argument for the trailing slash —
 * there is no such route here, and the alternative is a worker that misses its
 * own root.
 *
 * ── WHY THE SCOPE IS NARROWED AT ALL ───────────────────────────────────────
 *
 * The script sits at `/sw.js`, whose default scope is the whole origin. Asking
 * for `/m` narrows it, which browsers allow without any extra header — you can
 * always control less than your path implies, never more.
 *
 * Narrowing matters here. The desk portal has no use for an offline shell, and
 * the traveller share page must never be cached at all: it is somebody's
 * private manifest, opened as often as not on a borrowed phone. A root-scoped
 * worker would quietly become responsible for both.
 *
 * ── WHY THIS RUNS IN AN EFFECT AND FAILS QUIETLY ───────────────────────────
 *
 * Registration is a side effect with no render, and it must never be the
 * reason a page does not load. A browser with service workers disabled, a
 * private window, an insecure origin — all of them reject here, and all of
 * them are fine: the app works online without a worker. What is NOT fine is
 * pretending it will work offline, which is why `manager-app-inner.tsx` warns
 * separately when the offline STORE is unavailable. The two failures are
 * different and only one of them is worth interrupting somebody over.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js', { scope: '/m' }).catch((error) => {
      // Logged, not surfaced. See above for why this is not an error state.
      console.info('[field] offline shell not registered:', error);
    });
  }, []);

  return null;
}
