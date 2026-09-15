/// <reference lib="webworker" />

/**
 * Sharma Travels' service worker — the field app's half of working offline.
 *
 * ── WHAT THIS IS AND IS NOT ────────────────────────────────────────────────
 *
 * Kaafil ships NO service worker, deliberately. Offline has two halves and
 * they belong to different people: the kit owns the OUTBOX — queueing a write
 * made with no signal, draining it in order, resolving conflicts against
 * server time — and the host owns the APP SHELL, because caching documents and
 * chunks is a question about a build the kit has never seen.
 *
 * `installKaafilOfflineShell` is the seam between them, and it is the only
 * thing here that came out of the box.
 *
 * ── THE KIT OWNS EVERY NON-API GET. PLAN AROUND IT. ────────────────────────
 *
 * This took a wrong turn first, so it is worth stating plainly. The kit's
 * `fetch` handler calls `respondWith` for EVERY GET that is not an API call:
 * navigations go network-first with the shell as fallback, and everything else
 * is cache-first with a network fallback that does NOT write back.
 *
 * Two consequences, both load-bearing:
 *
 * 1. A second `fetch` listener adding host rules is dead code. The kit has
 *    already responded; yours never runs. (The docs say it "calls respondWith
 *    only for requests it actually owns" — it turns out it owns nearly all of
 *    them.)
 * 2. Because the network fallback never populates the cache, anything not in
 *    `precache` is never available offline. `precache` is not an optimisation
 *    here; it is the entire offline surface.
 *
 * So the precache list is generated from the real build — see
 * `scripts/build-sw.ts`.
 *
 * ── THE ONE OPTION THAT MUST NOT BE WRONG ──────────────────────────────────
 *
 * `isApiRequest` defaults to "any kaafil.in host", which is right for a host
 * whose browser talks to the engine directly — and wrong for this one, because
 * our session mints are proxied through OUR origin at `/api/session`. Leave the
 * default and a stale `/api/health` could be served from disk, which is how an
 * app ends up confidently showing yesterday's answer. Both are named: our own
 * `/api/` prefix AND the engine host the browser calls once it holds a session.
 *
 * ── SCOPE IS `/m` AND ONLY `/m` ────────────────────────────────────────────
 *
 * Registered with `{ scope: '/m/' }`, matching the manifest. The desk portal
 * has no use for an offline shell, and the traveller share page must never be
 * cached at all — it is somebody's private manifest, opened on a borrowed
 * phone as often as not.
 */

declare const self: ServiceWorkerGlobalScope;

import { installKaafilOfflineShell } from 'kaafil-react-uikit/offline';

/**
 * Injected by `scripts/build-sw.ts` from the real Next build output.
 *
 * In development it is just the shell: dev chunks are generated on demand and
 * renamed constantly, so precaching them would be meaningless. Offline is a
 * production behaviour here, and `pnpm build && pnpm start` is how you test it.
 */
declare const __PRECACHE__: readonly string[];

/**
 * Derived from the build too, so a new build invalidates the old cache.
 * `activate` deletes every cache whose name differs — this string is the only
 * revalidation knob, which is why the kit refuses to invent a second one.
 */
declare const __CACHE_NAME__: string;

installKaafilOfflineShell({
  cacheName: __CACHE_NAME__,
  // The manager route itself. It is `ssr: false`, so the server sends a shell
  // and the client boots the surface — which makes this document a genuine app
  // shell rather than a snapshot of one user's data.
  appShellUrl: '/m',
  precache: __PRECACHE__,
  isApiRequest: (url) =>
    (url.origin === self.location.origin && url.pathname.startsWith('/api/')) ||
    url.hostname.endsWith('kaafil.in'),
});

/** Take over open tabs on the next load rather than waiting for every one to close. */
self.addEventListener('activate', () => {
  void self.clients.claim();
});
