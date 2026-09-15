'use client';

import { BRAND } from '@/config/brand';

/**
 * What the Kaafil surfaces are told about the host's brand.
 *
 * The visual half of blending in is `styles/kaafil-bridge.css`, which maps the
 * CRM's tokens onto Kaafil's. This is the other half: the name and the mark the
 * kit puts in its own chrome, so an embedded screen says "Travyan" rather than
 * "Kaafil" without anyone editing a Kaafil file.
 *
 * `appName` is overridable per portal, and the field app needs it. The default
 * is the desk's name — "Sharma Travels Admin" — and the kit puts it at the top
 * of the manager's Now tab, which would tell a tour leader standing in a valley
 * that they are looking at an admin console. The two portals are two products;
 * they need two names.
 *
 * `headStrategy` is the interesting one. On the two staff surfaces it is
 * `'none'`: those screens live INSIDE a page the CRM already owns, and a
 * component that rewrites `<title>` and the favicon out from under its host is
 * a component you cannot embed twice. The share page is the opposite case —
 * it IS the whole document — so it passes `'own-page'` and lets the kit set the
 * head from the share token's own metadata.
 */
export function hostBrand(
  appName: string = BRAND.productName,
  headStrategy: 'none' | 'own-page' = 'none',
) {
  return {
    appName,
    ...(BRAND.logoPath === null ? {} : { logo: BRAND.logoPath, logoMark: BRAND.logoPath }),
    headStrategy,
  };
}

/**
 * The brand the traveller's share page wears.
 *
 * Passing a brand matters more here than anywhere else in the repo, and it is
 * the easiest one to forget: mount this surface without one and the page
 * renders blank where the operator's mark should be. The staff surfaces sit
 * inside chrome that is already branded; this page IS the chrome. It is opened
 * from a WhatsApp message by somebody who has never heard of the operator, let
 * alone Kaafil, and an unbranded page gives them nothing to recognise.
 *
 * `own-page` because this document is the kit's to own — see above.
 */
export function shareBrand() {
  return hostBrand(BRAND.companyName, 'own-page');
}

/**
 * Turns a share token into a link on THIS host's domain.
 *
 * Kaafil returns a token and never a URL — the traveller page is ours, at
 * `/t/:token`, and the engine has no idea that route exists. Without this the
 * desk's share dialog can only show a bare UUID, which is not something an
 * operator can send to a family.
 *
 * Built from `window.location.origin` rather than a configured base URL
 * because this repo is run locally, on whatever port is free, and a hardcoded
 * `localhost:3000` would hand out dead links the moment it is not. A deployed
 * copy should read a `NEXT_PUBLIC_APP_URL` instead, and that is the one line
 * that changes.
 */
export function buildShareUrl(token: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/t/${encodeURIComponent(token)}`;
}
