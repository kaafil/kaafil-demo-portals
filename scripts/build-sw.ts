/**
 * `pnpm build:sw` — bundle `sw/index.ts` into `public/sw.js`, with the precache
 * list and cache name compiled into it.
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
 * Precaching is for what must ALREADY be on the device the first time it opens
 * with no signal: the shell, the sign-in page, the manifest and the brand
 * assets. Nothing else belongs here, because the worker sets `runtimeCache`
 * and caches successful same-origin responses as they are fetched.
 *
 * That split is the right one for Next specifically. Its chunk filenames carry
 * content hashes decided during `next build`, and it emits no Workbox manifest
 * to read them from — so a worker source cannot name them, and caching them on
 * demand beats trying to enumerate a directory that has not been written yet.
 *
 * Offline is a production behaviour — `pnpm build && pnpm start` is how to test
 * it — because a dev build renames its chunks on every edit.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { build } from 'esbuild';
import { BRAND } from '@/config/brand';
import { buildManifest } from '@/config/manifest';

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
 * `/m/login` is in this list deliberately, and it is the entry most likely to
 * look redundant: a leader whose cached credential has expired is sent to
 * sign in, and a sign-in page that needs the network to render is a sign-in
 * page they cannot reach.
 */
const precache = [
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

/**
 * Name the cache after its contents, so a new build is a new cache and the old
 * one is dropped on activate. Hashing beats a hand-bumped version string:
 * nobody forgets to change it.
 *
 * TWO THINGS GO INTO THE HASH, AND THE SECOND ONE IS THE BUG FIX.
 *
 * Hashing the precache LIST alone is brand-blind. It is very nearly the same
 * handful of strings on every client branch — `/m`, `/m/login`, the manifest
 * URL, and a brand folder whose FILE NAMES a branch mostly keeps. So a
 * re-skin produced a byte-identical cache name, `activate` found nothing to
 * delete, and a device that had already installed the app kept serving the
 * previous operator's manifest and mark out of Cache Storage indefinitely.
 *
 * That is worse than the static-manifest bug it sits next to: generating the
 * manifest correctly and then never invalidating it means the fix only reaches
 * people who had not installed yet. So the manifest BODY goes in too — it
 * carries the brand's name and colours, which is exactly what changes on a
 * re-skin and exactly what a stale cache would pin.
 *
 * The prefix follows the brand for the same reason. Every branch used to ship a
 * bucket called `sharma-field-…`, visible in the Application tab of DevTools,
 * on a demo being shown to the prospect whose name is not Sharma.
 */
const cacheSlug = BRAND.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const cacheName = `${cacheSlug}-field-${createHash('sha256')
  .update(precache.join('\n'))
  .update('\u0000')
  .update(JSON.stringify(buildManifest()))
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
