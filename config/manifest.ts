/**
 * The installed field app's identity, derived rather than typed out.
 *
 * ── THE BUG THIS EXISTS TO CLOSE ───────────────────────────────────────────
 *
 * `public/manifest.webmanifest` used to be a checked-in JSON file naming a
 * specific operator — `"Sharma Travels Field"`, `"STPL Field"`, and `main`'s
 * own accent as `theme_color`. It sat OUTSIDE the four files a client branch
 * edits, so it was not a thing a branch author forgot: it was a thing they had
 * no reason to look at. `client/travyan` was byte-identical, which means a
 * prospect installing the Travyan demo to their home screen got an icon
 * labelled "STPL Field" and a slate-blue splash belonging to somebody else.
 *
 * Deleting the file is the fix. Not "generating it and checking it in" — a
 * generated file on disk is still a file a helpful person can hand-edit and
 * have silently overwritten on the next build, which is the trap `public/sw.js`
 * already needs a `.gitignore` entry to explain. There is nothing left to
 * inherit.
 *
 * ── WHY THE COLOUR IS PARSED OUT OF CSS ────────────────────────────────────
 *
 * `styles/tokens.css` states the rule plainly: if you are typing a `#` outside
 * that file, you are writing a bug. Copying the accent into `config/brand.ts`
 * would give it two homes, and the second one would rot — a branch would change
 * its accent, watch the CRM and the embedded Kaafil surfaces both follow, and
 * never notice that the Android splash screen had quietly stayed behind.
 *
 * So this reads the stylesheet. It is not elegant, and it is the only way to
 * have one source of truth for a value that a CSS file owns and a JSON document
 * needs.
 *
 * ── NO `server-only` HERE, DELIBERATELY ────────────────────────────────────
 *
 * `config/env.ts` has none either, for the same reason: `scripts/build-sw.ts`
 * runs under plain `tsx`, outside any Next bundle, where `server-only` throws.
 * Nothing in this module holds a credential — it reads two colours out of a
 * stylesheet — so the guard would buy nothing and break the one caller that
 * most needs to agree with this one.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MetadataRoute } from 'next';
import { BRAND } from '@/config/brand';

/**
 * One declared value out of `styles/tokens.css`.
 *
 * The pattern matches the file's two-space indentation deliberately — it is the
 * same shape `scripts/audit-tokens.ts` already matches on, so that file has one
 * indentation convention with two readers rather than two parsers that can
 * disagree about what counts as a declaration.
 */
function declaredValue(css: string, name: string): string {
  const match = new RegExp(`^ {2}${name}:\\s*([^;]+);`, 'm').exec(css);

  if (match?.[1] === undefined) {
    throw new Error(
      `styles/tokens.css declares no ${name}. The web manifest reads it for a colour, ` +
        'so a renamed or deleted token has to fail the build rather than ship a manifest ' +
        'with a missing field.',
    );
  }

  return match[1].trim();
}

/**
 * One literal colour out of `styles/tokens.css`, following `var()` indirection.
 *
 * Following it is the point, not a convenience. The colour a manifest wants for
 * `theme_color` is whatever the top bar actually is, and the chrome tokens are
 * deliberately written as roles pointing at ramp steps — `--topbar-bg` is
 * `var(--accent)` on `main` and `var(--surface)` on a branch with white chrome.
 * Reading the declaration without resolving it would hand an OS installer the
 * string "var(--accent)", which it cannot use.
 *
 * The chain is bounded because a cycle in the token file would otherwise hang
 * the build, and a build that hangs is much harder to diagnose than one that
 * says which token it was walking.
 */
function resolveColour(name: string): string {
  const css = readFileSync(join(process.cwd(), 'styles', 'tokens.css'), 'utf8');

  let current = name;
  for (let hop = 0; hop < 8; hop += 1) {
    const value = declaredValue(css, current);
    const indirect = /^var\(\s*(--[a-z0-9-]+)\s*\)$/.exec(value);
    if (indirect?.[1] === undefined) return value;
    current = indirect[1];
  }

  throw new Error(
    `Resolving ${name} in styles/tokens.css went eight hops without reaching a literal — ` +
      `stopped at ${current}. That is a cycle in the chrome tokens.`,
  );
}

export function buildManifest(): MetadataRoute.Manifest {
  return {
    // `app/(manager)/layout.tsx` titles the field app the same way. The two
    // should always agree, because they are the same app named twice — once in
    // the browser tab and once on the home screen.
    name: `${BRAND.shortName} Field`,
    short_name: BRAND.shortName,
    description: `The ${BRAND.vocabulary.leader}'s app — works with no signal.`,

    // Structure, not brand: the field app is mounted at `/m` on every branch,
    // and `scope` is what keeps an installed window from wandering into the
    // desk portal.
    id: '/m',
    start_url: '/m',
    scope: '/m',
    display: 'standalone',
    orientation: 'portrait',

    // The browser chrome around an installed window, so it should be whatever
    // this brand's top bar actually is — `main` fills it with the accent, a
    // branch with white chrome points it at the surface, and both are right for
    // their own skin. `background_color` is the splash shown before the app
    // paints, so it is the canvas the app comes up on.
    theme_color: resolveColour('--topbar-bg'),
    background_color: resolveColour('--canvas'),

    // Two fixed paths rather than a walk of `public/brand/`, because those
    // filenames ARE the branch contract: a branch swaps the file and keeps the
    // path, exactly as `BRAND.logoPath` works.
    icons: [
      { src: '/brand/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/brand/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],

    shortcuts: [
      { name: 'Log an expense', url: '/m?action=expense' },
      { name: 'Collect a payment', url: '/m?action=collect' },
    ],
  };
}
