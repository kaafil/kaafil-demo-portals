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
 * ── WHY IT READS `.next/static` ────────────────────────────────────────────
 *
 * The kit's fetch handler never writes to the cache — its network fallback
 * responds without caching. So anything absent from `precache` is simply not
 * available offline, which makes this list the whole offline surface rather
 * than a warm-up optimisation.
 *
 * Workbox users get this list from `self.__WB_MANIFEST`. Without Workbox, the
 * equivalent is to walk the build output, which is all this does.
 *
 * ORDER MATTERS: run AFTER `next build`, or there is nothing to walk. `pnpm
 * build` sequences them. In dev there is no production build and the list is
 * just the shell — offline is a production behaviour, and `pnpm build && pnpm
 * start` is how to test it.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { build } from 'esbuild';

const STATIC_DIR = '.next/static';

/** Every emitted asset, as the URL the browser will ask for. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (!entry.endsWith('.map')) {
      // Source maps are for a human with devtools open, who by definition has
      // a network. Precaching them doubles the install for no field benefit.
      out.push(`/_next/static/${posix.relative(STATIC_DIR, full.split('\\').join('/'))}`);
    }
  }
  return out;
}

/** Static assets under `public/`, as the URLs they are served at. */
function walkPublic(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkPublic(full, out);
    else out.push(`/${posix.relative('public', full.split('\\').join('/'))}`);
  }
  return out;
}

const hasBuild = existsSync(STATIC_DIR);

/**
 * The shell first, then the build. `/m/login` is in here deliberately: a leader
 * whose session cached credential has expired lands on sign-in, and a sign-in
 * page that needs the network to render is a sign-in page they cannot reach.
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
  ...(hasBuild ? walk(STATIC_DIR) : []),
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
    `cache ${cacheName}, ${precache.length} precached` +
    (hasBuild ? '' : ' — no production build found, shell only (offline needs `pnpm build`)'),
);
