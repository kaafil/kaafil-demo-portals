/**
 * `pnpm build:sw` — bundle `sw/index.ts` into `public/sw.js`, with a precache
 * list read off the real Next build.
 *
 * ── WHY THIS STEP EXISTS AT ALL ────────────────────────────────────────────
 *
 * `kaafil-react-uikit/offline` is an ES module in `node_modules`, and a classic
 * service worker cannot `import` from there — the path is not served and
 * `importScripts` does not do ESM. So the worker gets bundled like any other
 * entry point. It is a 3 KB dependency-free module, which is exactly why the
 * kit put the offline rules in a subpath importing neither React nor the SDK.
 *
 * Next does not build service workers, and that is reasonable: a worker is not
 * part of the app graph.
 *
 * ── WHY THE PRECACHE LIST IS SHORT ─────────────────────────────────────────
 *
 * It used to walk `.next/static` and precache the entire build, because the
 * kit's miss path returned the network's answer without storing it — so
 * anything absent from `precache` was never available offline.
 *
 * `kaafil-react-uikit@0.10.0` added `runtimeCache`, which caches successful
 * same-origin responses as they are fetched. That is the right shape for Next:
 * chunk hashes are decided at build time and there is no `__WB_MANIFEST` to
 * read them from, so caching on demand beats enumerating a directory.
 *
 * What stays precached is what must be present on a COLD offline start, before
 * anything has been fetched once: the shell, the sign-in page, the manifest
 * and the brand assets.
 *
 * Offline is still a production behaviour — `pnpm build && pnpm start` is how
 * to test it — because a dev build's chunks are renamed on every edit.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { build } from 'esbuild';

/** Static assets under `public/`, as the URLs they are served at. */
function walkPublic(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkPublic(full, out);
    else out.push(`/${posix.relative('public', full.split('\\').join('/'))}`);
  }
  return out;
}

/**
 * The shell first, then the build. `/m/login` is in here deliberately: a leader
 * whose session cached credential has expired lands on sign-in, and a sign-in
 * page that needs the network to render is a sign-in page they cannot reach.
 */
const precache = [
  // The shell and the handful of files that must be there on a COLD offline
  // start, before anything has been fetched once. Everything else — Next's
  // hashed chunks, the fonts — is cached at runtime by the kit's
  // `runtimeCache`, which is why this list is short and hand-written again
  // rather than walked out of `.next/static`.
  '/m',
  '/m/login',
  '/manifest.webmanifest',
  // The WHOLE brand folder, not a named list. `BRAND.logoPath` differs per
  // client branch — `logo.svg` on main, `logo.png` on Travyan — and a
  // hardcoded list meant the masthead rendered a broken-image icon offline on
  // whichever branch did not match. Precaching the folder means a branch that
  // drops in its own mark gets it cached without editing this file, which is
  // the same promise the rest of the branch workflow makes.
  ...(existsSync('public/brand') ? walkPublic('public/brand') : []),
];

// Name the cache after its contents, so a new build is a new cache and the old
// one is dropped on activate. Hashing the list beats a hand-bumped version
// string: nobody forgets to change it.
const cacheName = `sharma-field-${createHash('sha256')
  .update(precache.join('\n'))
  .digest('hex')
  .slice(0, 8)}`;

const result = await build({
  entryPoints: ['sw/index.ts'],
  outfile: 'public/sw.js',
  bundle: true,
  // A classic worker, not a module one: `importScripts` semantics are what
  // every browser that supports service workers agrees on.
  format: 'iife',
  target: 'es2020',
  platform: 'browser',
  minify: process.env.NODE_ENV === 'production',
  sourcemap: false,
  logLevel: 'warning',
  metafile: true,
  define: {
    __PRECACHE__: JSON.stringify(precache),
    __CACHE_NAME__: JSON.stringify(cacheName),
  },
});

const out = result.metafile.outputs['public/sw.js'];
console.log(
  `sw → public/sw.js (${out === undefined ? '?' : `${(out.bytes / 1024).toFixed(1)} kB`}), ` +
    `cache ${cacheName}, ${precache.length} precached (the rest is cached at runtime)`,
);
