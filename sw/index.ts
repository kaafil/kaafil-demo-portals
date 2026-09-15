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
 * ── THE KIT OWNS EVERY NON-API GET ─────────────────────────────────────────
 *
 * Its `fetch` handler answers every GET except three kinds: a non-`GET`,
 * anything `isApiRequest` claims, and anything `isHostOwned` declines
 * (same-origin by default). Everything else is already answered by the time a
 * second `fetch` listener would see it, because the first `respondWith` wins —
 * so adding host rules in a listener of your own does not work. Exclude the
 * route with `isHostOwned` instead.
 *
 * `runtimeCache` is how the rest of the build becomes available offline.
 * Without it, anything absent from `precache` never is: the miss path returns
 * the network's answer without storing it. With it, Next's content-hashed
 * chunks are cached as they are fetched — which is what a Next app needs,
 * since those filenames are only decided at build time and there is no
 * `__WB_MANIFEST` to enumerate them from.
 *
 * The honest consequence: the app must be opened ONCE with signal
 * before it works without. That is true of every PWA and is better said out
 * loud than discovered in a valley.
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
 * Registered with `{ scope: '/m' }` — no trailing slash. Scope is a prefix
 * match, so `/m/` would control `/m/login` and NOT `/m`, which is the route
 * the whole offline story is about. `components/kaafil/register-sw.tsx` is
 * where that is set, and carries the longer explanation.
 *
 * Narrow at all because the desk portal has no use for an offline shell, and
 * the traveller share page must never be cached — it is somebody's private
 * manifest, opened on a borrowed phone as often as not.
 */

import { installKaafilOfflineShell } from 'kaafil-react-uikit/offline';

/**
 * A service worker's global is a `ServiceWorkerGlobalScope`, not a `Window`.
 * TypeScript types `self` as the latter for an ordinary module, so it is
 * re-declared here — this is what makes `self.clients` and `skipWaiting()`
 * typecheck, and the `/// <reference lib="webworker" />` at the top of the file
 * is what supplies the type.
 */
declare const self: ServiceWorkerGlobalScope;

/**
 * Injected by `scripts/build-sw.ts`: the short list of files that must already
 * be on the device for a COLD offline start, before anything has been fetched
 * once. Everything else arrives through `runtimeCache`.
 *
 * Offline is a production behaviour either way — `pnpm build && pnpm start` is
 * how to test it, because a dev build renames its chunks on every edit and
 * nothing cached under one name is still valid under the next.
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
  // Next decides its chunk hashes at build time and ships no Workbox manifest,
  // so a worker source cannot name them to precache them. Caching them as they
  // are requested is the supported answer, and it is why `precache` below stays
  // a short hand-written list rather than a generated copy of the whole build.
  runtimeCache: true,
});

/** Take over open tabs on the next load rather than waiting for every one to close. */
self.addEventListener('activate', () => {
  void self.clients.claim();
});
